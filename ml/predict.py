import sys
import json
import joblib
import numpy as np
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "model.pkl"
)

model = joblib.load(MODEL_PATH)

def predict(data):

    X = np.array([[
        float(data["co"]),
        float(data["ch4"]),
        float(data["temp"]),
        float(data["hum"]),
        float(data["wind_speed"])
    ]])

    prediction = model.predict(X)[0]

    probabilities = model.predict_proba(X)[0]

    labels = [
        "Low",
        "Moderate",
        "High",
        "Extreme"
    ]

    ml_prediction = labels[int(prediction)]

    ml_proba = {
        labels[i]: round(
            float(probabilities[i]) * 100,
            2
        )
        for i in range(len(labels))
    }

    ml_confidence = round(
        float(max(probabilities)) * 100,
        2
    )

    return {
        "ml_prediction": ml_prediction,
        "ml_label_idx": int(prediction),
        "ml_confidence": ml_confidence,
        "ml_proba": ml_proba
    }

class PredictionHandler(
    BaseHTTPRequestHandler
):

    def do_POST(self):

        if self.path != "/predict":

            self.send_response(404)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.end_headers()

            self.wfile.write(
                json.dumps({
                    "error": "Endpoint not found"
                }).encode()
            )

            return


        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    0
                )
            )

            body = self.rfile.read(
                content_length
            )

            data = json.loads(
                body.decode("utf-8")
            )

            result = predict(data)

            response = json.dumps(
                result
            ).encode("utf-8")

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.send_header(
                "Content-Length",
                str(len(response))
            )

            self.end_headers()

            self.wfile.write(
                response
            )

        except Exception as e:

            response = json.dumps({
                "error": str(e)
            }).encode("utf-8")

            self.send_response(500)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.send_header(
                "Content-Length",
                str(len(response))
            )

            self.end_headers()

            self.wfile.write(
                response
            )


    def log_message(
        self,
        format,
        *args
    ):

        print(
            format % args
        )

if __name__ == "__main__":

    server = HTTPServer(
        ("0.0.0.0", 5000),
        PredictionHandler
    )

    print(
        "PyroWatch ML API running on port 5000"
    )

    server.serve_forever()