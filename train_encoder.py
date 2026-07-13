import pandas as pd
from sklearn.preprocessing import LabelEncoder
import joblib

# 1. Load your training data
df = pd.read_csv('8086_hardware_simulation.csv')

# 2. Extract ONLY the first word (the opcode) from the instruction column
# Example: "MOV AX, BX" -> "MOV"
opcodes = df['Instruction'].astype(str).str.upper().str.strip().apply(lambda x: x.split()[0])

# 3. Create and train the encoder
encoder = LabelEncoder()
encoder.fit(opcodes)

# 4. Save it
joblib.dump(encoder, '8086_label_encoder.pkl')

print(f"Encoder trained successfully with {len(encoder.classes_)} unique opcodes.")
print(f"Classes: {encoder.classes_}")