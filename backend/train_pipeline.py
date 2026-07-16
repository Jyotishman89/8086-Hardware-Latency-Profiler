import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

print("[SYSTEM] Booting Training Pipeline...")

try:
    df = pd.read_csv("xgb_context_data.csv")
except FileNotFoundError:
    print("[ERROR] Could not find xgb_context_data.csv. Run generate_xgb_data.py first.")
    exit()

categorical_cols = ['prev2_op', 'prev1_op', 'curr_op', 'next1_op', 'next2_op', 'op1', 'op2']
encoders = {}

for col in categorical_cols:
    le = LabelEncoder()
    df[col] = df[col].astype(str)
    df[col] = le.fit_transform(df[col])
    encoders[col] = le

le_diag = LabelEncoder()
df['diagnostic_label'] = le_diag.fit_transform(df['diagnostic_label'])
encoders['diagnostic_label'] = le_diag

features = [
    'prev2_op', 'prev1_op', 'curr_op', 'next1_op', 'next2_op',
    'op1', 'op2', 'is_alu', 'is_branch', 'is_mem', 
    'mem_read', 'mem_write', 'has_imm', 'reg_dependency'
]

X = df[features]
y_t_states = df['t_states']
y_diagnostic = df['diagnostic_label']

X_train, X_test, y_t_train, y_t_test, y_d_train, y_d_test = train_test_split(
    X, y_t_states, y_diagnostic, test_size=0.2, random_state=42
)

print("[TRAINING] Building XGBoost Regressor (T-States)...")
regressor = xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.1)
regressor.fit(X_train, y_t_train)
reg_score = regressor.score(X_test, y_t_test)
print(f"         -> Regressor R2 Score: {reg_score:.4f}")

print("[TRAINING] Building XGBoost Classifier (Diagnostics)...")
classifier = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1, objective='multi:softprob')
classifier.fit(X_train, y_d_train)
clf_score = classifier.score(X_test, y_d_test)
print(f"         -> Classifier Accuracy: {clf_score:.4f}")

print("[EXPORT] Saving models and encoders to disk...")
joblib.dump(regressor, 'xgb_regressor.pkl')
joblib.dump(classifier, 'xgb_classifier.pkl')
joblib.dump(encoders, 'label_encoders.pkl')
joblib.dump(features, 'model_features.pkl') 
