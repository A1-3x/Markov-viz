import csv

input_csv = "transition_matrix_Q.csv"
output_js = "transition_data.js"

with open(input_csv, newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    states = reader.fieldnames[1:]  # skip 'From'
    js_array = []

    for row in reader:
        js_obj = [f'From: "{row["From"]}"']
        for state in states:
            js_obj.append(f'"{state}": {row[state]}')
        js_array.append("    {" + ", ".join(js_obj) + "}")

js_code = "const transitionData = [\n" + ",\n".join(js_array) + "\n];\n"

with open(output_js, "w") as f:
    f.write(js_code)

print(f"JavaScript data written to {output_js}") 