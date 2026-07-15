import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib

df = pd.read_csv("xgb_context_data.csv")
encoder = LabelEncoder()

all_ops = pd.concat([df['Prev_Op'], df['Curr_Op'], df['Next_Op']]).unique()
encoder.fit(all_ops)

df['Prev_Enc'] = encoder.transform(df['Prev_Op'])
df['Curr_Enc'] = encoder.transform(df['Curr_Op'])
df['Next_Enc'] = encoder.transform(df['Next_Op'])

X = df[['Prev_Enc', 'Curr_Enc', 'Next_Enc', 'Category']]
y = df['T_States']

model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    random_state=42
)
model.fit(X, y)

joblib.dump(encoder, 'label_encoder.pkl')
joblib.dump(model, 'xgboost_model.pkl')