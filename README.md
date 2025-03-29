# Geobase Video Tutorial: Building a Geospatial Data Visualization App

This repository contains the code for a tutorial that demonstrates how to build a geospatial data visualization application using DuckDB, MotherDuck, and GeoBase. The tutorial is available on the Geobase YouTube channel.

## 🎥 Tutorial Video

Watch the tutorial video on the Geobase YouTube channel to learn how to build this application step by step.

## 🚀 Features

This application demonstrates:

- Integration of DuckDB UI for local development
- Importing GeoParquet files into local tables
- Adding tables to MotherDuck
- Connecting GeoBase to tables
- Creating materialized views with geospatial columns
- Building a modern web UI with interactive features:
  - Interactive map visualization
  - Real-time spatial statistics
  - 2D/3D view switching
  - Difference view analysis
  - Dynamic color mapping
  - Hover effects and tooltips

## 🛠️ Tech Stack

- **DuckDB**: For local data processing and analysis
- **MotherDuck**: For cloud-based data storage and collaboration
- **Geobase**: For geospatial data visualization and vector tile serving
- **MapLibre GL JS**: For interactive map rendering
- **Chart.js**: For statistical visualizations

## 📊 Dataset

This application visualizes London's Cardiovascular Disease Prevalence data from the eMOTIONAL Cities project (funded by the European Union's Horizon 2020 research and innovation programme). The data shows the weighted prevalence (WPREV) of cardiovascular disease across London using H3 hexagonal grid cells.

Data source attribution: eMOTIONAL Cities project, funded by the European Union's Horizon 2020 research and innovation programme.

## 🏗️ Project Structure

```
.
├── code/
│   ├── css/
│   │   └── map.css         # Map and UI styles
│   ├── js/
│   │   └── map.js          # Map initialization and interaction logic
│   ├── docs/
│   │   ├── duckdb-ui.md    # DuckDB UI setup instructions
│   │   └── script.md       # Tutorial script
│   └── index.html          # Main application page
└── README.md               # This file
```

## 🚀 Getting Started

1. Clone this repository
2. Navigate to the `code` directory:
   ```bash
   cd code
   ```
3. Install the required dependencies:
   ```bash
   npm install -g serve
   ```
4. Set up your Geobase credentials:
   - Get your Geobase project reference and anon API key from your Geobase dashboard
   - Update the credentials in `js/map.js`:
     ```javascript
     const API_KEY = "your-anon-api-key";
     const GEOBASE_URL = "https://your-project-ref.geobase.app";
     ```
5. Start the development server:
   ```bash
   npx serve .
   ```
6. Open your browser and navigate to `http://localhost:3000`

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Data Attribution

The cardiovascular disease prevalence data used in this visualization is sourced from the eMOTIONAL Cities project, which is funded by the European Union's Horizon 2020 research and innovation programme.

## 🙏 Acknowledgments

- eMOTIONAL Cities project team
- European Union's Horizon 2020 research and innovation programme
- All contributors and maintainers of the used libraries
