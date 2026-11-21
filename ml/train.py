import os, sqlite3, json, joblib
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR=Path(__file__).resolve().parent
DB_PATH=Path(os.getenv('PYROWATCH_DB','/data/pyrowatch1.db'))
MODEL_DIR=BASE_DIR/'models'; MODEL_DIR.mkdir(parents=True,exist_ok=True)
MODEL_PATH=MODEL_DIR/'forecast_models.pkl'
HORIZON_MINUTES=15; RESAMPLE_RULE='1min'; TARGET_TOLERANCE_MINUTES=2
MIN_TRAIN_ROWS=40; TEST_RATIO=.20; RANDOM_STATE=42
MODEL_VERSION='pyrowatch-rf-15m-operational-v3'
BASE_FEATURES=['co','ch4','temp','hum','fri','wind_speed_sensor','spread_rate_cmph','wind_direction_sin','wind_direction_cos','hour_sin','hour_cos']

def load_database():
    if not DB_PATH.exists(): raise FileNotFoundError(f'Database tidak ditemukan: {DB_PATH}')
    with sqlite3.connect(DB_PATH) as con:
        df=pd.read_sql_query('''SELECT node_id,timestamp,co,ch4,temp,hum,fri,wind_speed,wind_speed_sensor,wind_direction_deg,spread_rate_cmph,observed_spread_rate_cmph FROM sensor_readings ORDER BY node_id,timestamp''',con)
    if df.empty: raise ValueError('Tabel sensor_readings kosong.')
    return df

def prepare(df):
    df=df.copy(); df['timestamp']=pd.to_datetime(df.timestamp,errors='coerce',utc=True); df=df.dropna(subset=['node_id','timestamp'])
    for c in ['co','ch4','temp','hum','fri','wind_speed','wind_speed_sensor','wind_direction_deg','spread_rate_cmph','observed_spread_rate_cmph']:
        if c in df: df[c]=pd.to_numeric(df[c],errors='coerce')
    if 'wind_speed_sensor' not in df: df['wind_speed_sensor']=np.nan
    df['wind_speed_sensor']=df['wind_speed_sensor'].fillna(df.get('wind_speed'))
    for c in ['spread_rate_cmph','observed_spread_rate_cmph']:
        if c not in df: df[c]=np.nan
    return df

def make_features(frame):
    out=frame.copy(); rad=np.deg2rad(out['wind_direction_deg'])
    out['wind_direction_sin']=np.sin(rad); out['wind_direction_cos']=np.cos(rad)
    hour=out.index.hour+out.index.minute/60
    out['hour_sin']=np.sin(2*np.pi*hour/24); out['hour_cos']=np.cos(2*np.pi*hour/24)
    return out

def aggregate(df):
    frames=[]
    for node,group in df.groupby('node_id'):
        group=group.sort_values('timestamp').set_index('timestamp')
        numeric=group.select_dtypes(include=[np.number])
        if numeric.empty: continue
        raw_minute=numeric.resample(RESAMPLE_RULE).mean()
        # Predictor values may be interpolated briefly to handle sparse sensor ticks,
        # but targets must come from an actual minute observation, never interpolation.
        labels=raw_minute[['fri','wind_speed_sensor','observed_spread_rate_cmph']].copy()
        labels.columns=['fri_label','wind_speed_label','observed_spread_label']
        minute=raw_minute.interpolate(method='time',limit=2,limit_area='inside')
        minute=minute.join(labels)
        minute['node_id']=node; frames.append(make_features(minute))
    if not frames: raise ValueError('Tidak ada data historis untuk training.')
    return frames

def supervised(frames):
    rows=[]; horizon=pd.Timedelta(minutes=HORIZON_MINUTES); tolerance=pd.Timedelta(minutes=TARGET_TOLERANCE_MINUTES)
    for frame in frames:
        frame=frame.sort_index(); times=frame.index; node=str(frame.node_id.iloc[0])
        for t,row in frame.iterrows():
            target=t+horizon; pos=times.searchsorted(target)
            if pos>=len(times): continue
            target_t=times[pos]
            if abs(target_t-target)>tolerance: continue
            future=frame.iloc[pos]
            sample={'node_id':node,'sample_timestamp':t,'target_timestamp':target_t}
            for col in BASE_FEATURES: sample[col]=row.get(col,np.nan)
            current_fri_label=row.get('fri_label',np.nan)
            future_fri_label=future.get('fri_label',np.nan)
            sample['target_fri_change']=(future_fri_label-current_fri_label) if np.isfinite(future_fri_label) and np.isfinite(current_fri_label) else np.nan
            sample['target_wind_speed']=future.get('wind_speed_label',np.nan)
            sample['target_observed_spread_rate']=future.get('observed_spread_label',np.nan)
            rows.append(sample)
    ds=pd.DataFrame(rows)
    if ds.empty: raise ValueError('Tidak ada pasangan data historis dengan horizon 15 menit.')
    return ds

def model():
    return Pipeline([('imputer',SimpleImputer(strategy='median',keep_empty_features=True)),('rf',RandomForestRegressor(n_estimators=400,max_depth=14,min_samples_split=4,min_samples_leaf=2,max_features=.9,random_state=RANDOM_STATE,n_jobs=-1))])

def split(ds):
    ds=ds.sort_values('sample_timestamp').reset_index(drop=True); i=int(len(ds)*(1-TEST_RATIO))
    if i<MIN_TRAIN_ROWS: raise ValueError(f'Data train terlalu sedikit: {i}.')
    train,test=ds.iloc[:i].copy(),ds.iloc[i:].copy(); test_start=test.sample_timestamp.min()
    train=train[train.target_timestamp<test_start]
    if len(train)<MIN_TRAIN_ROWS or test.empty: raise ValueError('Data tidak cukup setelah split kronologis dan pencegahan leakage.')
    return train,test

def train_target(ds,target,features):
    usable=ds.dropna(subset=[target]).copy()
    if len(usable)<MIN_TRAIN_ROWS:
        print(f'[SKIP] {target}: {len(usable)} label valid; minimal {MIN_TRAIN_ROWS}.'); return None
    tr,te=split(usable); m=model(); m.fit(tr[features],tr[target]); pred=m.predict(te[features])
    metrics={'samples_train':len(tr),'samples_test':len(te),'mae':float(mean_absolute_error(te[target],pred)),'rmse':float(np.sqrt(mean_squared_error(te[target],pred))),'r2':float(r2_score(te[target],pred)) if len(te)>1 else None}
    print(target,json.dumps(metrics)); m.fit(usable[features],usable[target]); return {'model':m,'metrics':metrics,'label_count':int(len(usable))}

def main():
    ds=supervised(aggregate(prepare(load_database())))
    features=[c for c in BASE_FEATURES if c in ds and ds[c].notna().any()]
    models={}
    for key,target in [('fri_change_15m','target_fri_change'),('future_wind_speed','target_wind_speed'),('future_observed_spread_rate','target_observed_spread_rate')]:
        result=train_target(ds,target,features)
        if result: models[key]=result
    if not models: raise ValueError('Tidak ada target yang memiliki label cukup. Pastikan data sensor dan observasi terkumpul.')
    payload={'models':models,'feature_columns':features,'horizon_minutes':HORIZON_MINUTES,'resample_rule':RESAMPLE_RULE,'target_tolerance_minutes':TARGET_TOLERANCE_MINUTES,'model_version':MODEL_VERSION,'training_rows':int(len(ds)),'trained_at':pd.Timestamp.utcnow().isoformat()}
    joblib.dump(payload,MODEL_PATH); print('Training selesai:',MODEL_PATH,'models:',list(models))
if __name__=='__main__': main()
