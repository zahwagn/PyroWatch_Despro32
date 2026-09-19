# ml/train.py
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import joblib
import os

print(" PyroWatch ML Training ")

# Generate dataset synthetic
# Features: [co, ch4, temp, hum, wind_speed]
# Label   : 0=Low, 1=Moderate, 2=High, 3=Extreme
np.random.seed(42)
N = 2000

def generate_samples(n, co_range, ch4_range, temp_range,
                     hum_range, wind_range, label):
    return np.column_stack([
        np.random.uniform(*co_range,   n),
        np.random.uniform(*ch4_range,  n),
        np.random.uniform(*temp_range, n),
        np.random.uniform(*hum_range,  n),
        np.random.uniform(*wind_range, n),
        np.full(n, label)
    ])

# Low     : aman, FRI < 0.4
low      = generate_samples(N, (0,30),    (0,100),   (20,30), (70,100), (0,3),   0)
# Moderate: waspada, FRI 0.4-0.6
moderate = generate_samples(N, (30,80),   (100,400), (30,45), (40,70),  (2,6),   1)
# High    : bahaya, FRI 0.6-0.8
high     = generate_samples(N, (80,150),  (400,700), (45,52), (25,40),  (5,10),  2)
# Extreme : kritis, smoldering aktif, FRI > 0.8
extreme  = generate_samples(N, (150,200), (700,1000),(52,60), (0,25),   (8,15),  3)

data = np.vstack([low, moderate, high, extreme])
X    = data[:, :5].astype(float)
y    = data[:, 5].astype(int)

print(f"Total sampel training: {len(X)}")
print(f"Distribusi label: Low={sum(y==0)}, Moderate={sum(y==1)}, "
      f"High={sum(y==2)}, Extreme={sum(y==3)}\n")

# Training: Logistic Regression dengan StandardScaler pipeline
model = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", LogisticRegression(
        max_iter=1000,
        multi_class="multinomial",
        solver="lbfgs",
        C=1.0
    ))
])

model.fit(X, y)

# Cross-validation 5-fold
scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
print(f"Akurasi CV (5-fold): {scores.mean():.4f} +/- {scores.std():.4f}")

if scores.mean() < 0.90:
    print("PERINGATAN: akurasi di bawah 90%, cek distribusi dataset")
else:
    print(f"Target akurasi >= 90% TERCAPAI")

# Simpan model
output_path = os.path.join(os.path.dirname(__file__), "model.pkl")
joblib.dump(model, output_path)
print(f"\nModel disimpan: {output_path}")
print("Training selesai")