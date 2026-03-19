"""
XGBoost stockout risk inference wrapper.

Training:  see notebooks/train_stockout_model.ipynb
Model file: app/data/stockout_model.pkl  (not committed; run train notebook first)
"""
import joblib
import numpy as np
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent / "data" / "stockout_model.pkl"

SIZE_MAP = {"small": 0, "medium": 1, "large": 2}


class StockoutModel:
    def __init__(self, model_path: Path = MODEL_PATH) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. Run the training notebook first."
            )
        artifact = joblib.load(model_path)
        self._model = artifact["model"]
        self._feature_cols = artifact["feature_cols"]

        import shap
        self._explainer = shap.TreeExplainer(self._model)

    def predict(self, features: dict) -> dict:
        """
        Predict stockout risk for a single store scenario.

        Args:
            features: dict with keys:
                demand_multiplier (float)
                nearby_stores_closed (int)
                days_supply_disrupted (int)
                weather_severity (float)
                store_size (str): "small" | "medium" | "large"

        Returns:
            {
                "stockout_probability": float,          # 0–1
                "top_factors": [                        # top 2 SHAP contributors
                    {"feature": str, "direction": "increases"|"decreases", "magnitude": float},
                    ...
                ]
            }
        """
        encoded = dict(features)
        encoded["store_size"] = SIZE_MAP[features["store_size"]]

        X = np.array([[encoded[col] for col in self._feature_cols]], dtype=float)

        probability = float(self._model.predict_proba(X)[0, 1])

        shap_vals = self._explainer.shap_values(X)[0]  # shape (n_features,)
        ranked = sorted(
            zip(self._feature_cols, shap_vals),
            key=lambda x: abs(x[1]),
            reverse=True,
        )
        top_factors = [
            {
                "feature": feat,
                "direction": "increases" if val > 0 else "decreases",
                "magnitude": round(abs(float(val)), 4),
            }
            for feat, val in ranked[:2]
        ]

        return {"stockout_probability": round(probability, 4), "top_factors": top_factors}
