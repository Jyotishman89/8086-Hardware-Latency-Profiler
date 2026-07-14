import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib

print("Booting 8086 Hardware Latency Model Retraining Pipeline...")

data = [
    ["MOV", 3, 2, 0, 0, 2.0],
    ["MOV", 3, 2, 0, 1, 4.0],
    ["ADD", 3, 2, 0, 0, 3.0],
    ["SUB", 3, 2, 0, 0, 3.0],
    ["CMP", 3, 2, 0, 0, 3.0],
    ["SHL", 3, 2, 0, 1, 2.0],
    ["SHR", 3, 2, 0, 1, 2.0],
    
    ["MOV", 1, 2, 1, 0, 9.0],
    ["ADD", 1, 2, 1, 0, 16.0],
    ["PUSH", 4, 1, 1, 0, 11.0],
    ["POP", 4, 1, 1, 0, 8.0],
    
    ["JMP", 2, 1, 0, 0, 15.0],
    ["JNE", 2, 1, 0, 0, 16.0],
    ["JZ",  2, 1, 0, 0, 16.0],
    ["JNZ", 2, 1, 0, 0, 16.0],
    
    ["LOOP", 2, 1, 0, 0, 17.0] 
]

df = pd.DataFrame(data, columns=["Opcode", "Category", "Operand_Count", "Memory_Access", "Immediate_Value", "T_States"])

df_augmented = pd.concat([df]*50, ignore_index=True)
df_augmented['T_States'] += np.random.normal(0, 0.2, size=len(df_augmented)) # +/- 0.2 cycle noise

encoder = LabelEncoder()
df_augmented['Opcode_Encoded'] = encoder.fit_transform(df_augmented['Opcode'])

X = df_augmented[['Opcode_Encoded', 'Category', 'Operand_Count', 'Memory_Access', 'Immediate_Value']]
y = df_augmented['T_States']

print(" Training XGBoost Regressor on expanded instruction set...")
model = xgb.XGBRegressor(
    n_estimators=100, 
    learning_rate=0.1, 
    max_depth=4, 
    random_state=42
)
model.fit(X, y)

score = model.score(X, y)
print(f"Training Complete. Model R^2 Score: {score:.4f}")

joblib.dump(encoder, 'label_encoder.pkl')
joblib.dump(model, 'xgboost_model.pkl')

print("Saved 'label_encoder.pkl' and 'xgboost_model.pkl'. Ready for inference!")