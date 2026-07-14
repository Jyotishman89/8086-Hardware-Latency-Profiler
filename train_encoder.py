import pandas as pd
from sklearn.preprocessing import LabelEncoder
import joblib

df = pd.read_csv('8086_hardware_simulation.csv')

opcodes = df['Instruction'].astype(str).str.upper().str.strip().apply(lambda x: x.split()[0])

encoder = LabelEncoder()
encoder.fit(opcodes)

joblib.dump(encoder, '8086_label_encoder.pkl')

print(f"Encoder trained successfully with {len(encoder.classes_)} unique opcodes.")
print(f"Classes: {encoder.classes_}")
