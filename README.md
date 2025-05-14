# Markov Chain Migration Visualization

This project visualizes state-to-state migration patterns using a Markov chain transition matrix. The visualization is presented as an interactive heatmap that allows users to explore migration probabilities between different states.

## Features

- Interactive heatmap visualization of migration transition probabilities
- Hover effects to show detailed transition probabilities
- Color-coded representation of migration flows
- Responsive design that works on different screen sizes

## Files

- `index.html` - Main webpage
- `styles.css` - Styling for the visualization
- `script.js` - JavaScript code for the interactive heatmap
- `transition_data.js` - Data file containing the transition matrix
- `csv_to_js.py` - Python script to convert CSV data to JavaScript format

## Setup

1. Clone this repository
2. Open `index.html` in a web browser
3. Hover over the heatmap cells to see transition probabilities

## Data Processing

The transition matrix data is processed using the included Python script:

```bash
python csv_to_js.py
```

This script converts the CSV data into a JavaScript array format that can be used by the visualization.

## Dependencies

- No external libraries required
- Modern web browser with JavaScript enabled

## License

MIT License 