// ==============================================
// GEOBASE INTEGRATION
// This code demonstrates Geobase's powerful geospatial capabilities:
// 1. Vector tile server integration
// 2. Spatial statistics and analysis
// 3. Real-time data visualization
// ==============================================

// Initialize Geobase client with API key and URL
const API_KEY = "REPLACE_WITH_YOUR_ANON_API_KEY";
const GEOBASE_URL = "REPLACE_WITH_YOUR_PROJECT_REF";

// Validate credentials
function validateCredentials() {
  if (API_KEY === "REPLACE_WITH_YOUR_ANON_API_KEY" || GEOBASE_URL === "REPLACE_WITH_YOUR_PROJECT_REF") {
    const errorMessage = `ℹ️  Geobase Configuration Needed

Please update the following in map.js:
1. Replace "REPLACE_WITH_YOUR_ANON_API_KEY" with your Geobase anon API key
2. Replace "REPLACE_WITH_YOUR_PROJECT_REF" with your Geobase project reference

To get your credentials:
1. Sign up at <a href="https://geobase.app" target="_blank" style="color: #0d6efd; text-decoration: none;">https://geobase.app</a>
2. Create a new project
3. Get your project reference and anon API key from the project settings

Example:
const API_KEY = "eyJhbGciOiJIUzI1NiIs...";
const GEOBASE_URL = "https://your-project-ref.geobase.app";`;
    
    // Create and show error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 600px;
      width: 90%;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;
    
    errorDiv.innerHTML = `
      <h2 style="
        color: #2196f3;
        margin: 0 0 20px 0;
        font-size: 20px;
        font-weight: 600;
      ">Configuration Required</h2>
      <div style="
        white-space: pre-wrap;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        margin: 0 0 20px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #212529;
      ">${errorMessage}</div>
      <button onclick="this.parentElement.remove()" style="
        background: #2196f3;
        color: white;
        border: none;
        padding: 8px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s;
        box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
      ">Close</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Prevent map initialization
    throw new Error("Geobase credentials not configured");
  }
}

// Call validation before initializing the client
validateCredentials();

// ==============================================
// CORE GEOSPATIAL FEATURES
// 1. Vector Tile Server: Efficient streaming of geospatial data
// 2. Spatial Statistics: Real-time analysis of geographic areas
// 3. Interactive Visualization: Dynamic 2D/3D rendering
// ==============================================

// Simple wrapper function that just aliases supabase.createClient
function createGeobaseClient(url, apiKey) {
  return window.supabase.createClient(url, apiKey);
}

// Initialize client using the wrapper
const geobaseClient = createGeobaseClient(GEOBASE_URL, API_KEY);

// Flag to track if we've loaded statistics
let statisticsLoaded = false;
let globalStatsLoaded = false;

// Global statistics for the entire dataset
const globalViewStats = {
  min_value: 0.157281319300334,
  max_value: 3.50307222207387,
  mean_value: 0.839301407408151,
  median_value: 0.813782200088233,
  std_dev_value: 0.258986992743978,
};

// Current view statistics (will be updated as the map moves)
const currentViewStats = {
  min_value: 0.157281319300334,
  max_value: 3.50307222207387,
  mean_value: 0.839301407408151,
  median_value: 0.813782200088233,
  std_dev_value: 0.258986992743978,
};

// Active statistics object (points to either global or current view stats)
let statistics = currentViewStats;

// Function to generate a color based on value within a range using Viridis color map
function getColorForValue(value, min, max) {
  // Handle edge cases where min and max are the same or invalid
  if (min === max || !isFinite(min) || !isFinite(max) || !isFinite(value)) {
    return "rgba(33, 144, 141, 0.7)"; // Default to teal color
  }

  // Normalize the value between 0 and 1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Viridis color map - approximated with 6 key points
  // Colors from the Viridis palette (dark blue -> purple -> green -> yellow)
  const colors = [
    [68, 1, 84], // Dark purple (0.0)
    [59, 82, 139], // Blue-purple (0.2)
    [33, 144, 141], // Teal (0.4)
    [93, 201, 99], // Green (0.6)
    [253, 231, 37], // Yellow (0.8)
    [253, 231, 37], // Yellow (1.0)
  ];

  // Find the two colors to interpolate between
  const idx = Math.min(
    colors.length - 2,
    Math.floor(normalized * (colors.length - 1))
  );
  const t = (normalized - idx / (colors.length - 1)) * (colors.length - 1);

  // Linear interpolation between the two colors
  const r = Math.round(
    colors[idx][0] + t * (colors[idx + 1][0] - colors[idx][0])
  );
  const g = Math.round(
    colors[idx][1] + t * (colors[idx + 1][1] - colors[idx][1])
  );
  const b = Math.round(
    colors[idx][2] + t * (colors[idx + 1][2] - colors[idx][2])
  );

  return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

// Function to create a step expression for maplibre color styling
function createColorSteps(min, max, property) {
  // Handle edge cases where min and max are the same or invalid
  if (min === max || !isFinite(min) || !isFinite(max)) {
    console.warn("Invalid min/max values for color steps:", min, max);
    return "rgba(33, 144, 141, 0.7)"; // Default to teal color
  }

  const steps = ["step", ["get", property]];

  // Default color for values below min (dark purple from Viridis)
  steps.push("rgba(68, 1, 84, 0.7)");

  // Create 10 steps between min and max
  const range = max - min;
  const stepSize = range / 10;

  for (let i = 1; i <= 10; i++) {
    const value = min + stepSize * i;
    steps.push(value);
    steps.push(getColorForValue(value, min, max));
  }

  return steps;
}

// Function to inspect feature properties to find the correct property name
function inspectFeatureProperties() {
  if (!map.getLayer("public.hex350_grid_cardio_view-layer")) {
    console.log("Layer not found");
    return;
  }

  // Query rendered features to get properties
  const features = map.queryRenderedFeatures({
    layers: ["public.hex350_grid_cardio_view-layer"],
  });

  if (features.length > 0) {
    console.log("Feature properties:", features[0].properties);
    // Find property that might contain wprev values
    const properties = features[0].properties;
    const possibleWprevProperties = [];

    // Make sure we have valid statistics to compare against
    if (
      !statistics ||
      !isFinite(statistics.min_value) ||
      !isFinite(statistics.max_value)
    ) {
      console.warn("Cannot inspect features: statistics not properly loaded");
      return;
    }

    for (const key in properties) {
      const value = properties[key];
      // Check if the value is numeric and within our expected range
      if (
        !isNaN(parseFloat(value)) &&
        parseFloat(value) >= statistics.min_value * 0.5 &&
        parseFloat(value) <= statistics.max_value * 1.5
      ) {
        possibleWprevProperties.push({
          key,
          value: parseFloat(value),
        });
      }
    }

    console.log("Possible wprev properties:", possibleWprevProperties);

    // If we found possible properties, use the first one
    if (possibleWprevProperties.length > 0) {
      const wprevProperty = possibleWprevProperties[0].key;
      console.log("Using property for styling:", wprevProperty);

      // Update the map with the correct property
      updateMapStylingWithProperty(wprevProperty);
    } else {
      console.warn("No properties found that match the expected value range");
    }
  } else {
    console.log("No features found in the current view");
  }
}

// Function to update the map styling based on statistics and property name
function updateMapStylingWithProperty(propertyName) {
  if (!map.getLayer("public.hex350_grid_cardio_view-layer")) {
    console.log("Layer not found, cannot update styling");
    return;
  }

  // Make sure we have valid statistics
  if (
    !statistics ||
    !isFinite(statistics.min_value) ||
    !isFinite(statistics.max_value)
  ) {
    console.warn("Cannot update map styling: statistics not properly loaded");
    return;
  }

  // Check if min and max are the same (would cause division by zero)
  if (statistics.min_value === statistics.max_value) {
    console.warn("Min and max values are the same, using default styling");
    map.setPaintProperty(
      "public.hex350_grid_cardio_view-layer",
      "fill-color",
      "rgba(33, 144, 141, 0.7)" // Default teal color
    );
    return;
  }

  console.log(
    `Updating map styling with property: ${propertyName} using ${
      statistics === globalViewStats ? "global" : "current view"
    } statistics`
  );

  try {
    const colorSteps = createColorSteps(
      statistics.min_value,
      statistics.max_value,
      propertyName
    );

    // Remove the existing layer
    if (map.getLayer("public.hex350_grid_cardio_view-layer")) {
      map.removeLayer("public.hex350_grid_cardio_view-layer");
    }

    // Add the layer back with the appropriate type based on current 3D state
    map.addLayer({
      id: "public.hex350_grid_cardio_view-layer",
      type: is3DViewActive ? "fill-extrusion" : "fill",
      source: "geobase_tile_source",
      "source-layer": "public.hex350_grid_cardio_view",
      paint: is3DViewActive
        ? {
            "fill-extrusion-color": colorSteps,
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["get", propertyName],
              statistics.min_value,
              0,
              statistics.max_value,
              5000,
            ],
            "fill-extrusion-opacity": 0.8,
            "fill-extrusion-base": 0,
            "fill-extrusion-vertical-gradient": true,
          }
        : {
            "fill-color": colorSteps,
            "fill-opacity": 0.8,
            "fill-outline-color": "rgba(255, 255, 255, 1)",
          },
      filter: ["==", "$type", "Polygon"],
    });

    // Store the property name for future use
    window.wprevPropertyName = propertyName;

    console.log(`Map styling updated successfully in ${is3DViewActive ? '3D' : '2D'} mode`);
  } catch (error) {
    console.error("Error updating map styling:", error);
  }
}

// Function to update the map styling based on statistics
function updateMapStyling() {
  // If we already know the property name, use it
  if (window.wprevPropertyName) {
    updateMapStylingWithProperty(window.wprevPropertyName);
    return;
  }

  // Otherwise try to inspect features to find it
  setTimeout(() => {
    inspectFeatureProperties();
  }, 1000);
}

// Chart instance to be reused
let statsChart = null;

// Function to create or update the statistics chart
function updateStatsChart() {
  try {
    // Make sure we have valid statistics
    if (
      !statistics ||
      !isFinite(statistics.min_value) ||
      !isFinite(statistics.max_value)
    ) {
      console.warn("Cannot update chart: statistics not properly loaded");

      // Show placeholder values

      return;
    }

    // Check if min and max are the same (would cause division by zero)
    if (statistics.min_value === statistics.max_value) {
      console.warn(
        "Min and max values are the same, cannot create meaningful chart"
      );
      return;
    }

    // Store current chart data for comparison
    let currentChartData = null;
    if (statsChart) {
      currentChartData = JSON.stringify(statsChart.data);
    }

    // Calculate mean +/- stddev ranges for the chart
    const meanMinusStdDev = statistics.mean_value - statistics.std_dev_value;
    const meanPlusStdDev = statistics.mean_value + statistics.std_dev_value;

    // Prepare data for the chart
    const chartData = {
      labels: ["Min", "Mean - StdDev", "Mean", "Mean + StdDev", "Max"],
      datasets: [
        {
          label:
            statistics === globalViewStats ? "Global View" : "Current View",
          data: [
            statistics.min_value,
            meanMinusStdDev,
            statistics.mean_value,
            meanPlusStdDev,
            statistics.max_value,
          ],
          backgroundColor:
            statistics === globalViewStats
              ? "rgba(33, 150, 243, 0.7)" // Blue for global
              : "rgba(76, 175, 80, 0.7)", // Green for current
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
        },
      ],
    };

    // If both global and current stats are loaded, add the other dataset for comparison
    if (globalStatsLoaded && statisticsLoaded) {
      if (statistics === globalViewStats) {
        // We're showing global stats, add current view as comparison
        const currentMeanMinusStdDev =
          currentViewStats.mean_value - currentViewStats.std_dev_value;
        const currentMeanPlusStdDev =
          currentViewStats.mean_value + currentViewStats.std_dev_value;

        chartData.datasets.push({
          label: "Current View",
          data: [
            currentViewStats.min_value,
            currentMeanMinusStdDev,
            currentViewStats.mean_value,
            currentMeanPlusStdDev,
            currentViewStats.max_value,
          ],
          backgroundColor: "rgba(76, 175, 80, 0.5)", // Green with transparency
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
        });
      } else {
        // We're showing current stats, add global view as comparison
        const globalMeanMinusStdDev =
          globalViewStats.mean_value - globalViewStats.std_dev_value;
        const globalMeanPlusStdDev =
          globalViewStats.mean_value + globalViewStats.std_dev_value;

        chartData.datasets.push({
          label: "Global View",
          data: [
            globalViewStats.min_value,
            globalMeanMinusStdDev,
            globalViewStats.mean_value,
            globalMeanPlusStdDev,
            globalViewStats.max_value,
          ],
          backgroundColor: "rgba(33, 150, 243, 0.5)", // Blue with transparency
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
        });
      }
    }

    // Check if the data has actually changed
    const newChartData = JSON.stringify(chartData);
    if (currentChartData === newChartData && statsChart) {
      console.log("Chart data unchanged, skipping update");
      return;
    }

    // Chart configuration
    const chartConfig = {
      type: "bar",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true, // Force y-axis to start at 0
            title: {
              display: true,
              text: "WPREV Value (Weighted Prevalence)",
              font: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: 500,
              },
              tooltip:
                "WPREV is a weighted prevalence measure that accounts for both disease occurrence and population factors",
            },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 11,
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: {
                family: "'Inter', sans-serif",
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            titleColor: "#333",
            bodyColor: "#333",
            borderColor: "rgba(0, 0, 0, 0.1)",
            borderWidth: 1,
            titleFont: {
              family: "'Inter', sans-serif",
              size: 13,
              weight: 600,
            },
            bodyFont: {
              family: "'Inter', sans-serif",
              size: 12,
            },
            padding: 10,
            boxPadding: 5,
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.raw.toFixed(3)}`;
              },
            },
          },
        },
      },
    };

    // Create or update the chart
    const ctx = document.getElementById("stats-chart").getContext("2d");

    if (statsChart) {
      // Update existing chart
      statsChart.data = chartData;
      statsChart.update();
    } else {
      // Create new chart
      statsChart = new Chart(ctx, chartConfig);
    }
  } catch (error) {
    console.error("Error updating statistics chart:", error);
  }
}

// ==============================================
// SPATIAL STATISTICS FUNCTIONS
// These functions leverage Geobase's spatial analysis capabilities:
// - get_wprev_statistics: Global statistics
// - get_wprev_statistics_by_bbox: Area-specific statistics
// ==============================================

// Function to query the get_wprev_statistics RPC
async function queryWprevStatistics() {
  const resultsOutput = document.getElementById("results-output");
  resultsOutput.textContent = "Loading...";

  try {
    // Call the RPC function
    const { data, error } = await geobaseClient.rpc("get_wprev_statistics");

    if (error) {
      console.error("Error querying get_wprev_statistics:", error);
      resultsOutput.textContent = `Error: ${error.message}`;
      return;
    }

    // Log the data to console
    console.log("get_wprev_statistics result:", data);

    // Check if data is an array and has at least one element
    if (data && Array.isArray(data) && data.length > 0) {
      const statsData = data[0]; // Get the first (and only) result

      // Check if we have all the required fields
      const requiredFields = [
        "min_value",
        "max_value",
        "mean_value",
        "median_value",
        "std_dev_value",
      ];
      const hasAllFields = requiredFields.every(
        (field) =>
          typeof statsData[field] === "number" && isFinite(statsData[field])
      );

      if (hasAllFields) {
        // Update our global statistics object with the actual data
        Object.assign(globalViewStats, statsData);
        globalStatsLoaded = true;

        // If we're currently showing global stats, update the UI
        if (statistics === globalViewStats) {
          updateStatsChart();
        }

        // Update the map styling if we're using global stats
        if (statistics === globalViewStats) {
          updateMapStyling();
        }

        // Update the comparison view if it's visible
        if (
          document.getElementById("comparison-view").style.display !== "none"
        ) {
          updateComparisonView();
        }

        // Display the data in the results panel
        resultsOutput.textContent = JSON.stringify(statsData, null, 2);
      } else {
        console.warn("Received incomplete statistics data from global query");
        resultsOutput.textContent =
          "Received incomplete statistics data from global query";
      }
    } else {
      resultsOutput.textContent = "No data returned for global statistics";
    }
  } catch (err) {
    console.error("Exception when querying get_wprev_statistics:", err);
    resultsOutput.textContent = `Exception: ${err.message}`;
  }
}

// Function to switch to global statistics view
function switchToGlobalStats() {
  // Update button states
  document.getElementById("global-stats-btn").classList.add("active");
  document.getElementById("current-stats-btn").classList.remove("active");

  // Switch to global stats
  statistics = globalViewStats;

  // Update the UI
  updateStatsChart();
  updateMapStyling();
  updateHeatmapComparison(); // Ensure heatmap is updated

  // If global stats haven't been loaded yet, load them
  if (!globalStatsLoaded) {
    queryWprevStatistics();
  }
}

// Function to switch to current view statistics
function switchToCurrentStats() {
  // Update button states
  document.getElementById("global-stats-btn").classList.remove("active");
  document.getElementById("current-stats-btn").classList.add("active");

  // Switch to current view stats
  statistics = currentViewStats;

  // Update the UI
  updateStatsChart();
  updateMapStyling();
  updateHeatmapComparison(); // Ensure heatmap is updated
}

// Store the last queried bounds to avoid unnecessary updates
let lastQueriedBounds = null;

// Function to query the get_wprev_statistics_by_bbox RPC
async function queryWprevStatisticsByBbox() {
  // Skip if chart refreshing is disabled
  if (!shouldRefreshChart) return;

  // Store current view states
  const currentDifferenceView = showingDifferenceView;
  const current3DView = is3DViewActive;

  // Get the current map bounds
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Extract the coordinates
  const min_x = sw.lng;
  const min_y = sw.lat;
  const max_x = ne.lng;
  const max_y = ne.lat;

  // Check if the bounds have changed significantly (more than 5%)
  if (lastQueriedBounds) {
    const oldWidth = lastQueriedBounds.max_x - lastQueriedBounds.min_x;
    const oldHeight = lastQueriedBounds.max_y - lastQueriedBounds.min_y;
    const newWidth = max_x - min_x;
    const newHeight = max_y - min_y;

    const oldArea = oldWidth * oldHeight;
    const newArea = newWidth * newHeight;
    const areaChange = Math.abs(newArea - oldArea) / oldArea;

    if (areaChange < 0.05) {
      console.log("Map bounds changed by less than 5%, skipping statistics update");
      return;
    }
  }

  lastQueriedBounds = { min_x, min_y, max_x, max_y };

  const resultsOutput = document.getElementById("results-output");
  resultsOutput.textContent = "Loading statistics for current view...";

  try {
    const { data, error } = await geobaseClient.rpc("get_wprev_statistics_by_bbox", {
      min_x,
      min_y,
      max_x,
      max_y,
    });

    if (error) {
      console.error("Error querying get_wprev_statistics_by_bbox:", error);
      resultsOutput.textContent = `Error querying by bbox: ${error.message}`;
      return;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const statsData = data[0];
      const requiredFields = [
        "min_value",
        "max_value",
        "mean_value",
        "median_value",
        "std_dev_value",
      ];
      const hasAllFields = requiredFields.every(
        (field) => typeof statsData[field] === "number" && isFinite(statsData[field])
      );

      if (hasAllFields) {
        // Update the current view statistics
        Object.assign(currentViewStats, statsData);
        statisticsLoaded = true;

        // Update the stats chart
        updateStatsChart();
        
        // Only update the map styling if we're not in difference view
        if (!currentDifferenceView) {
          // Restore view states
          is3DViewActive = current3DView;
          statistics = currentViewStats;
          updateMapStyling();
        }

        // Update other UI elements
        updateHeatmapComparison();
        if (document.getElementById("comparison-view").style.display !== "none") {
          updateComparisonView();
        }

        // Update the results panel
        resultsOutput.textContent = `Statistics for current view:\n${JSON.stringify(
          statsData,
          null,
          2
        )}`;
      } else {
        console.warn("Received incomplete statistics data from bbox query");
        resultsOutput.textContent = "Received incomplete statistics data from bbox query";
      }
    } else {
      resultsOutput.textContent = "No data returned for the current view";
    }
  } catch (err) {
    console.error("Exception when querying get_wprev_statistics_by_bbox:", err);
    resultsOutput.textContent = `Exception: ${err.message}`;
  }
}


// Function to toggle the comparison view
function toggleComparisonView() {
  const comparisonView = document.getElementById("comparison-view");
  const toggleButton = document.getElementById("comparison-toggle");

  if (comparisonView.style.display === "none") {
    comparisonView.style.display = "block";
    toggleButton.textContent = "Hide Comparison View";
    updateComparisonView();
  } else {
    comparisonView.style.display = "none";
    toggleButton.textContent = "Show Side-by-Side Comparison";
  }
}

// Function to update the comparison view
function updateComparisonView() {
  // Make sure we have valid statistics
  if (!globalStatsLoaded || !statisticsLoaded) {
    console.warn(
      "Cannot update comparison view: statistics not properly loaded"
    );
    return;
  }

  // Update global values - removed min and max
  document.getElementById("global-mean").textContent =
    globalViewStats.mean_value.toFixed(2);
  document.getElementById("global-median").textContent =
    globalViewStats.median_value.toFixed(2);
  document.getElementById("global-stddev").textContent =
    globalViewStats.std_dev_value.toFixed(2);

  // Update current values - removed min and max
  document.getElementById("current-mean").textContent =
    currentViewStats.mean_value.toFixed(2);
  document.getElementById("current-median").textContent =
    currentViewStats.median_value.toFixed(2);
  document.getElementById("current-stddev").textContent =
    currentViewStats.std_dev_value.toFixed(2);

  // Add comparison indicators - removed min and max
  addComparisonIndicator(
    "mean",
    currentViewStats.mean_value,
    globalViewStats.mean_value
  );
  addComparisonIndicator(
    "median",
    currentViewStats.median_value,
    globalViewStats.median_value
  );
  addComparisonIndicator(
    "stddev",
    currentViewStats.std_dev_value,
    globalViewStats.std_dev_value
  );

  // Define threshold for showing median (as percentage difference from mean)
  const medianThreshold = 0.25; // 50% difference

  // Check if we should show the median row
  const globalMedianDiff =
    Math.abs(globalViewStats.median_value - globalViewStats.mean_value) /
    globalViewStats.mean_value;
  const currentMedianDiff =
    Math.abs(currentViewStats.median_value - currentViewStats.mean_value) /
    currentViewStats.mean_value;
  const showMedian =
    globalMedianDiff > medianThreshold || currentMedianDiff > medianThreshold;

  // Show or hide the median row
  const medianRow = document.querySelector(".comparison-row:nth-child(4)");
  if (medianRow) {
    medianRow.style.display = showMedian ? "flex" : "none";
  }

  // Update the modern stats comparison
  updateStatsComparison();

  // Update the heatmap
  updateHeatmapComparison();
}

// Function to update the heatmap comparison
function updateHeatmapComparison() {
  console.log("Updating heatmap comparison");

  // Get the container and clear it
  const container = document.getElementById("heatmap-container");
  if (!container) {
    console.error("Heatmap container not found");
    return;
  }

  // Clear existing markers
  container.innerHTML = "";

  // Find the overall min and max for the scale
  const overallMin = Math.min(
    globalViewStats.min_value,
    currentViewStats.min_value
  );
  const overallMax = Math.max(
    globalViewStats.max_value,
    currentViewStats.max_value
  );

  console.log(
    `Heatmap range: ${overallMin.toFixed(2)} to ${overallMax.toFixed(2)}`
  );

  // Update the labels
  const minLabel = document.getElementById("heatmap-min");
  const maxLabel = document.getElementById("heatmap-max");

  if (minLabel) minLabel.textContent = overallMin.toFixed(2);
  if (maxLabel) maxLabel.textContent = overallMax.toFixed(2);

  // Calculate the range
  const range = overallMax - overallMin;
  if (range === 0) {
    console.warn("Range is zero, cannot position markers");
    return;
  }

  // Define threshold for showing median (as percentage difference from mean)
  const medianThreshold = 0.25; // 5% difference

  // Calculate median differences
  const globalMedianDiff =
    Math.abs(globalViewStats.median_value - globalViewStats.mean_value) /
    globalViewStats.mean_value;
  const currentMedianDiff =
    Math.abs(currentViewStats.median_value - currentViewStats.mean_value) /
    currentViewStats.mean_value;

  try {
    // Add markers for global stats
    addHeatmapMarker(
      container,
      "min",
      globalViewStats.min_value,
      overallMin,
      range,
      "global"
    );
    addHeatmapMarker(
      container,
      "mean",
      globalViewStats.mean_value,
      overallMin,
      range,
      "global"
    );

    // Only add median if it differs significantly from mean
    if (globalMedianDiff > medianThreshold) {
      addHeatmapMarker(
        container,
        "median",
        globalViewStats.median_value,
        overallMin,
        range,
        "global"
      );
    }

    addHeatmapMarker(
      container,
      "max",
      globalViewStats.max_value,
      overallMin,
      range,
      "global"
    );

    // Add markers for current stats
    addHeatmapMarker(
      container,
      "min",
      currentViewStats.min_value,
      overallMin,
      range,
      "current"
    );
    addHeatmapMarker(
      container,
      "mean",
      currentViewStats.mean_value,
      overallMin,
      range,
      "current"
    );

    // Only add median if it differs significantly from mean
    if (currentMedianDiff > medianThreshold) {
      addHeatmapMarker(
        container,
        "median",
        currentViewStats.median_value,
        overallMin,
        range,
        "current"
      );
    }

    addHeatmapMarker(
      container,
      "max",
      currentViewStats.max_value,
      overallMin,
      range,
      "current"
    );

    console.log(`Added ${container.children.length} markers to heatmap`);
  } catch (error) {
    console.error("Error adding markers:", error);
  }
}

// Function to add a marker to the heatmap
function addHeatmapMarker(container, type, value, min, range, source) {
  try {
    // Create marker element
    const marker = document.createElement("div");
    marker.className = `heatmap-marker ${source} ${type}`;

    // Calculate position as percentage of the total range
    const position = ((value - min) / range) * 100;

    // Ensure the marker stays within the container bounds (5% to 95%)
    const boundedPosition = Math.max(5, Math.min(95, position));
    marker.style.left = `${boundedPosition}%`;

    // Set the label with abbreviated text to save space
    let label = "";
    if (type === "min") {
      label = "Min";
    } else if (type === "max") {
      label = "Max";
    } else if (type === "mean") {
      label = "Mean";
    } else if (type === "median") {
      label = "Med";
    }

    // Add source prefix to avoid confusion
    const sourcePrefix = source === "global" ? "G-" : "C-";

    // Format the value with 2 decimal places
    marker.setAttribute(
      "data-value",
      `${sourcePrefix}${label}: ${value.toFixed(2)}`
    );

    // For markers near the edges, add a special class to adjust label position
    if (boundedPosition < 10) {
      marker.classList.add("left-edge");
    } else if (boundedPosition > 90) {
      marker.classList.add("right-edge");
    }

    // Add the marker to the container
    container.appendChild(marker);

    console.log(
      `Added ${source} ${type} marker at position ${boundedPosition}% with value ${value.toFixed(
        2
      )}`
    );
  } catch (error) {
    console.error(`Error creating ${source} ${type} marker:`, error);
  }
}

// Function to add comparison indicators
function addComparisonIndicator(statType, currentValue, globalValue) {
  const currentElement = document.getElementById(`current-${statType}`);

  // Remove any existing indicators
  const existingIndicator = currentElement.querySelector(
    ".comparison-indicator"
  );
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Calculate percentage difference
  const diff = currentValue - globalValue;
  const percentDiff = (diff / globalValue) * 100;

  // Only add indicator if there's a significant difference (more than 0.5%)
  if (Math.abs(percentDiff) > 0.5) {
    const indicator = document.createElement("span");
    indicator.className = `comparison-indicator ${
      diff > 0 ? "higher" : "lower"
    }`;

    // Add arrow and percentage with better formatting
    const formattedPercentage = Math.abs(percentDiff).toFixed(1);
    indicator.innerHTML =
      diff > 0
        ? `&#9650; ${formattedPercentage}%`
        : `&#9660; ${formattedPercentage}%`;

    currentElement.appendChild(indicator);

    // Also highlight the value itself
    currentElement.style.color = diff > 0 ? "#4CAF50" : "#F44336";
  } else {
    // Reset color if difference is not significant
    currentElement.style.color = "";
  }
}

const BASE_MAPS = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      "raster-tiles": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "ESRI World Imagery",
      },
    },
    layers: [
      {
        id: "World_Street_Map",
        type: "raster",
        source: "raster-tiles",
        minzoom: 0,
        maxzoom: 24,
      },
    ],
  },
};

var map = new maplibregl.Map({
  container: "map",
  center: [-0.067023, 51.49483],
  style: BASE_MAPS.light,
  bounds: [-0.345969, 51.324423, 0.211923, 51.665236],
  pitch: 0,
  bearing: 0,
  antialias: true,
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), "bottom-right");

// Add a scale control
map.addControl(
  new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: "metric",
  }),
  "bottom-left"
);

map.on("load", () => {
  console.log("Map loaded, initializing data sources and layers");

  // Set initial 3D state to true and update button state
  is3DViewActive = true;
  document.getElementById("view-3d-toggle").classList.add("active");
  
  // Set initial pitch
  map.easeTo({
    pitch: 45,
    duration: 1000,
  });
  
  try {
    if (!map.getSource("geobase_tile_source")) {
      map.addSource("geobase_tile_source", {
        type: "vector",
        tiles: [
          `https://wmrosdnjsecywfkvxtrw.geobase.app/tileserver/v1/cached/public.hex350_grid_cardio_view/{z}/{x}/{y}.pbf?apikey=${API_KEY}`,
        ],
      });
      console.log("Added geobase_tile_source");
    }

    if (!map.getLayer("public.hex350_grid_cardio_view-layer")) {
      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          // Start with a default color until we find the correct property (using Viridis dark purple)
          "fill-color": "rgba(68, 1, 84, 0.2)",
          "fill-outline-color": "rgba(255, 255, 255, 1)",
        },
        filter: ["==", "$type", "Polygon"],
      });
      console.log("Added public.hex350_grid_cardio_view-layer");
    }

    // Create the initial statistics chart with placeholder values
    updateStatsChart();

    // Add a hover effect to show the value
    map.on("mousemove", "public.hex350_grid_cardio_view-layer", (e) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;

        // Use the detected property name or try to find a numeric property
        let valueProperty = window.wprevPropertyName;
        let value = null;

        if (valueProperty && properties[valueProperty] !== undefined) {
          value = parseFloat(properties[valueProperty]);
        } else {
          // Try to find any numeric property as a fallback
          for (const key in properties) {
            if (!isNaN(parseFloat(properties[key]))) {
              value = parseFloat(properties[key]);
              valueProperty = key;
              break;
            }
          }
        }

        if (value !== null) {
          // Create or update a popup
          if (!map.getSource("hover-point")) {
            map.addSource("hover-point", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [],
              },
            });

            map.addLayer({
              id: "hover-point-layer",
              type: "circle",
              source: "hover-point",
              paint: {
                "circle-radius": 5,
                "circle-color": "#ffffff",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#000000",
              },
            });
          }

          // Update the hover point
          map.getSource("hover-point").setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: e.lngLat.toArray(),
                },
                properties: {
                  value: value,
                },
              },
            ],
          });

          // Show the value in the results panel
          document.getElementById(
            "results-output"
          ).textContent = `Hex ${valueProperty}: ${value.toFixed(4)}`;
        }
      }
    });

    // Clear hover effect when mouse leaves the layer
    map.on("mouseleave", "public.hex350_grid_cardio_view-layer", () => {
      if (map.getSource("hover-point")) {
        map.getSource("hover-point").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    });

    // Add debounced event listener for map movement to update statistics
    let moveTimeout;
    map.on("moveend", () => {
      // Clear any existing timeout
      if (moveTimeout) {
        clearTimeout(moveTimeout);
      }

      // Only query statistics if chart refreshing is enabled
      if (shouldRefreshChart) {
        // Set a new timeout to debounce the API call
        moveTimeout = setTimeout(() => {
          // Call the RPC function with the current bounding box
          queryWprevStatisticsByBbox();
        }, 500); // Wait 500ms after movement stops before making the API call
      }
    });

    // Wait for the map to be fully loaded and rendered before making the initial queries
    map.once("idle", () => {
      console.log("Map is idle, making initial queries");

      // First query global statistics
      queryWprevStatistics();

      // Then query statistics for the current view
      setTimeout(() => {
        queryWprevStatisticsByBbox();
      }, 500);

      // Then inspect features to find the property to style
      setTimeout(() => {
        inspectFeatureProperties();
      }, 1000);

      // Set up event listeners for toggle buttons
      document
        .getElementById("global-stats-btn")
        .addEventListener("click", switchToGlobalStats);
      document
        .getElementById("current-stats-btn")
        .addEventListener("click", switchToCurrentStats);
    });
  } catch (error) {
    console.error("Error initializing map:", error);
  }
});

// ==============================================
// INTERACTIVE VISUALIZATION
// Demonstrates Geobase's advanced visualization features:
// 1. Dynamic 2D/3D switching
// 2. Real-time color mapping
// 3. Spatial difference analysis
// ==============================================

// Flag to track if we're showing the difference view
let showingDifferenceView = false;

// Function to toggle the difference view on the map
function toggleDifferenceView() {
  showingDifferenceView = document.getElementById("show-diff-toggle").checked;

  // Show/hide the separate info box
  document
    .getElementById("map-diff-info")
    .classList.toggle("visible", showingDifferenceView);

  // Make sure we have valid statistics
  if (!globalStatsLoaded || !statisticsLoaded) {
    console.warn("Cannot show difference view: statistics not properly loaded");
    return;
  }

  if (!map.getLayer("public.hex350_grid_cardio_view-layer")) {
    console.log("Layer not found, cannot update styling");
    return;
  }

  if (!window.wprevPropertyName) {
    console.warn("Property name not found, cannot update styling");
    return;
  }

  // Remove the existing layer first to ensure clean application of styles
  map.removeLayer("public.hex350_grid_cardio_view-layer");

  // Determine if we're in 3D mode
  const is3D = is3DViewActive;

  if (is3D) {
    // Create a 3D layer with appropriate coloring
    if (showingDifferenceView) {
      // Create difference expression for 3D
      const diffExpression = [
        "let",
        "value",
        ["get", window.wprevPropertyName],
        "globalMean",
        globalViewStats.mean_value,
        [
          "case",
          [">", ["var", "value"], ["var", "globalMean"]],
          [
            "interpolate",
            ["linear"],
            [
              "/",
              ["-", ["var", "value"], ["var", "globalMean"]],
              ["-", globalViewStats.max_value, globalViewStats.mean_value],
            ],
            0,
            "rgba(255, 255, 255, 0.7)",
            0.2,
            "rgba(255, 200, 200, 0.7)",
            0.5,
            "rgba(255, 100, 100, 0.7)",
            1,
            "rgba(255, 0, 0, 0.7)",
          ],
          ["<", ["var", "value"], ["var", "globalMean"]],
          [
            "interpolate",
            ["linear"],
            [
              "/",
              ["-", ["var", "globalMean"], ["var", "value"]],
              ["-", globalViewStats.mean_value, globalViewStats.min_value],
            ],
            0,
            "rgba(255, 255, 255, 0.7)",
            0.2,
            "rgba(200, 200, 255, 0.7)",
            0.5,
            "rgba(100, 100, 255, 0.7)",
            1,
            "rgba(0, 0, 255, 0.7)",
          ],
          "rgba(255, 255, 255, 0.7)", // Equal to global mean
        ],
      ];

      // Add 3D layer with difference coloring
      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill-extrusion",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          "fill-extrusion-color": diffExpression,
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["get", window.wprevPropertyName],
            statistics.min_value,
            0,
            statistics.max_value,
            5000,
          ],
          "fill-extrusion-opacity": 0.8,
          "fill-extrusion-base": 0,
          "fill-extrusion-vertical-gradient": true,
        },
        filter: ["==", "$type", "Polygon"],
      });

      // Update the legend to show difference
      addDifferenceLegend();
    } else {
      // Add 3D layer with regular coloring
      const colorSteps = createColorSteps(
        statistics.min_value,
        statistics.max_value,
        window.wprevPropertyName
      );

      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill-extrusion",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          "fill-extrusion-color": colorSteps,
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["get", window.wprevPropertyName],
            statistics.min_value,
            0,
            statistics.max_value,
            5000,
          ],
          "fill-extrusion-opacity": 0.8,
          "fill-extrusion-base": 0,
          "fill-extrusion-vertical-gradient": true,
        },
        filter: ["==", "$type", "Polygon"],
      });

    }
  } else {
    // Create a 2D layer with appropriate coloring
    if (showingDifferenceView) {
      // Create difference expression for 2D
      const diffExpression = [
        "let",
        "value",
        ["get", window.wprevPropertyName],
        "globalMean",
        globalViewStats.mean_value,
        [
          "case",
          [">", ["var", "value"], ["var", "globalMean"]],
          [
            "interpolate",
            ["linear"],
            [
              "/",
              ["-", ["var", "value"], ["var", "globalMean"]],
              ["-", globalViewStats.max_value, globalViewStats.mean_value],
            ],
            0,
            "rgba(255, 255, 255, 0.7)",
            0.2,
            "rgba(255, 200, 200, 0.7)",
            0.5,
            "rgba(255, 100, 100, 0.7)",
            1,
            "rgba(255, 0, 0, 0.7)",
          ],
          ["<", ["var", "value"], ["var", "globalMean"]],
          [
            "interpolate",
            ["linear"],
            [
              "/",
              ["-", ["var", "globalMean"], ["var", "value"]],
              ["-", globalViewStats.mean_value, globalViewStats.min_value],
            ],
            0,
            "rgba(255, 255, 255, 0.7)",
            0.2,
            "rgba(200, 200, 255, 0.7)",
            0.5,
            "rgba(100, 100, 255, 0.7)",
            1,
            "rgba(0, 0, 255, 0.7)",
          ],
          "rgba(255, 255, 255, 0.7)", // Equal to global mean
        ],
      ];

      // Add 2D layer with difference coloring
      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          "fill-color": diffExpression,
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255, 255, 255, 1)",
        },
        filter: ["==", "$type", "Polygon"],
      });

      // Update the legend to show difference
      addDifferenceLegend();
    } else {
      // Add 2D layer with regular coloring
      const colorSteps = createColorSteps(
        statistics.min_value,
        statistics.max_value,
        window.wprevPropertyName
      );

      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          "fill-color": colorSteps,
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255, 255, 255, 1)",
        },
        filter: ["==", "$type", "Polygon"],
      });

    }
  }
}

// Function to add a difference legend
function addDifferenceLegend() {
  // Remove existing legend if any
  const existingLegend = document.getElementById("map-legend");
  if (existingLegend) {
    existingLegend.remove();
  }

  // Create legend container
  const legend = document.createElement("div");
  legend.id = "map-legend";

  // Add title
  const title = document.createElement("h4");
  title.textContent = "Cardiovascular Disease Prevalence Comparison";
  title.style.margin = "0 0 10px 0";
  title.style.textAlign = "left";

  // Add info icon to the title
  const infoIcon = document.createElement("span");
  infoIcon.className = "info-icon";
  infoIcon.setAttribute(
    "data-tooltip",
    "WPREV (Weighted Prevalence) accounts for both disease occurrence and population factors"
  );
  infoIcon.textContent = "i";
  title.appendChild(infoIcon);

  legend.appendChild(title);

  // Add difference info text (previously in separate map-diff-info element)
  const diffInfoText = document.createElement("p");
  diffInfoText.textContent =
    "Showing difference between current view and global statistics. Red areas have higher weighted prevalence (WPREV) of cardiovascular disease than the London average, blue areas have lower weighted prevalence.";
  diffInfoText.style.fontSize = "12px";
  diffInfoText.style.color = "#666";
  diffInfoText.style.marginBottom = "12px";
  legend.appendChild(diffInfoText);

  // Create gradient bar for difference
  const gradientBar = document.createElement("div");
  gradientBar.style.width = "200px";
  gradientBar.style.height = "20px";
  gradientBar.style.background =
    "linear-gradient(to right, rgb(0, 0, 255), rgb(150, 150, 255), rgb(255, 255, 255), rgb(255, 150, 150), rgb(255, 0, 0))";
  gradientBar.style.marginBottom = "5px";
  gradientBar.style.borderRadius = "4px";
  legend.appendChild(gradientBar);

  // Add labels
  const labelsContainer = document.createElement("div");
  labelsContainer.style.display = "flex";
  labelsContainer.style.justifyContent = "space-between";
  labelsContainer.style.fontSize = "10px";
  labelsContainer.style.fontFamily = "'Inter', sans-serif";

  const lowerLabel = document.createElement("span");
  lowerLabel.textContent = "Lower than average";
  lowerLabel.style.color = "#555";
  labelsContainer.appendChild(lowerLabel);

  const equalLabel = document.createElement("span");
  equalLabel.textContent = "Average";
  equalLabel.style.color = "#555";
  labelsContainer.appendChild(equalLabel);

  const higherLabel = document.createElement("span");
  higherLabel.textContent = "Higher than average";
  higherLabel.style.color = "#555";
  labelsContainer.appendChild(higherLabel);
  //   right align the labels
  labelsContainer.style.textAlign = "center";

  legend.appendChild(labelsContainer);

  // Add description
  const description = document.createElement("p");
  description.textContent =
    "Shows how current view WPREV rates (weighted prevalence) compare to London average";
  description.style.fontSize = "12px";
  description.style.color = "#666";
  description.style.marginTop = "8px";
  description.style.marginBottom = "0";
  legend.appendChild(description);

  // Add legend to map
  document.body.appendChild(legend);
}

// ==============================================
// MAP INITIALIZATION
// Sets up the map with Geobase vector tiles and interactive features
// ==============================================

// ==============================================
// EVENT HANDLERS
// Manages real-time interactions with the spatial data:
// 1. Map movement tracking
// 2. Feature inspection
// 3. View state management
// ==============================================

// ==============================================
// UI CONTROLS
// Handles user interface interactions for:
// 1. View toggling (2D/3D)
// 2. Statistics display
// 3. Difference view analysis
// ==============================================

// Flag to track if we're in 3D view mode
let is3DViewActive = false;
// Flag to track if chart refresh is needed
let shouldRefreshChart = true;

// Function to toggle between 2D and 3D views
function toggle3DView() {
  is3DViewActive = !is3DViewActive;

  // Temporarily disable chart refreshing during view transition
  shouldRefreshChart = false;

  if (is3DViewActive) {
    // Switch to 3D view
    map.easeTo({
      pitch: 45,
      duration: 1000,
    });

    // Update the layer to fill-extrusion if needed
    if (map.getLayer("public.hex350_grid_cardio_view-layer")) {
      // Store current view state
      const currentDifferenceView = showingDifferenceView;

      // Remove the existing layer
      map.removeLayer("public.hex350_grid_cardio_view-layer");

      // Make sure we have valid statistics and property name
      if (statistics && window.wprevPropertyName) {
        // Create appropriate color expression based on current view mode
        let colorExpression;

        if (currentDifferenceView) {
          // Use difference coloring for 3D extrusion
          colorExpression = [
            "let",
            "value",
            ["get", window.wprevPropertyName],
            "globalMean",
            globalViewStats.mean_value,
            [
              "case",
              [">", ["var", "value"], ["var", "globalMean"]],
              [
                "interpolate",
                ["linear"],
                [
                  "/",
                  ["-", ["var", "value"], ["var", "globalMean"]],
                  ["-", globalViewStats.max_value, globalViewStats.mean_value],
                ],
                0,
                "rgba(255, 255, 255, 0.7)",
                0.2,
                "rgba(255, 200, 200, 0.7)",
                0.5,
                "rgba(255, 100, 100, 0.7)",
                1,
                "rgba(255, 0, 0, 0.7)",
              ],
              ["<", ["var", "value"], ["var", "globalMean"]],
              [
                "interpolate",
                ["linear"],
                [
                  "/",
                  ["-", ["var", "globalMean"], ["var", "value"]],
                  ["-", globalViewStats.mean_value, globalViewStats.min_value],
                ],
                0,
                "rgba(255, 255, 255, 0.7)",
                0.2,
                "rgba(200, 200, 255, 0.7)",
                0.5,
                "rgba(100, 100, 255, 0.7)",
                1,
                "rgba(0, 0, 255, 0.7)",
              ],
              "rgba(255, 255, 255, 0.7)", // Equal to global mean
            ],
          ];
        } else {
          // Use regular color scale for 3D extrusion
          colorExpression = createColorSteps(
            statistics.min_value,
            statistics.max_value,
            window.wprevPropertyName
          );
        }

        // Add the layer back as a fill-extrusion layer
        map.addLayer({
          id: "public.hex350_grid_cardio_view-layer",
          type: "fill-extrusion",
          source: "geobase_tile_source",
          "source-layer": "public.hex350_grid_cardio_view",
          paint: {
            // Use the appropriate color expression
            "fill-extrusion-color": colorExpression,
            // Create an extrusion height based on the WPREV value
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["get", window.wprevPropertyName],
              statistics.min_value,
              0,
              statistics.max_value,
              5000, // Maximum extrusion height in meters
            ],
            // Add some opacity to make it look better
            "fill-extrusion-opacity": 0.8,
            // Add a base height to create a cleaner look
            "fill-extrusion-base": 0,
            // Add a vertical gradient to create a more realistic 3D effect
            "fill-extrusion-vertical-gradient": true,
          },
          filter: ["==", "$type", "Polygon"],
        });
      }
    }
  } else {
    // Switch back to 2D view
    map.easeTo({
      pitch: 0,
      duration: 1000,
    });

    // If we have a layer and property name, update it back to a fill layer
    if (
      map.getLayer("public.hex350_grid_cardio_view-layer") &&
      window.wprevPropertyName
    ) {
      // Remove the 3D layer
      map.removeLayer("public.hex350_grid_cardio_view-layer");

      // Determine the appropriate color expression based on current view mode
      let colorExpression;

      if (showingDifferenceView) {
        // Use difference coloring for 2D view
        colorExpression = [
          "let",
          "value",
          ["get", window.wprevPropertyName],
          "globalMean",
          globalViewStats.mean_value,
          [
            "case",
            [">", ["var", "value"], ["var", "globalMean"]],
            [
              "interpolate",
              ["linear"],
              [
                "/",
                ["-", ["var", "value"], ["var", "globalMean"]],
                ["-", globalViewStats.max_value, globalViewStats.mean_value],
              ],
              0,
              "rgba(255, 255, 255, 0.7)",
              0.2,
              "rgba(255, 200, 200, 0.7)",
              0.5,
              "rgba(255, 100, 100, 0.7)",
              1,
              "rgba(255, 0, 0, 0.7)",
            ],
            ["<", ["var", "value"], ["var", "globalMean"]],
            [
              "interpolate",
              ["linear"],
              [
                "/",
                ["-", ["var", "globalMean"], ["var", "value"]],
                ["-", globalViewStats.mean_value, globalViewStats.min_value],
              ],
              0,
              "rgba(255, 255, 255, 0.7)",
              0.2,
              "rgba(200, 200, 255, 0.7)",
              0.5,
              "rgba(100, 100, 255, 0.7)",
              1,
              "rgba(0, 0, 255, 0.7)",
            ],
            "rgba(255, 255, 255, 0.7)", // Equal to global mean
          ],
        ];
      } else {
        // Use regular color scale for 2D view
        colorExpression = createColorSteps(
          statistics.min_value,
          statistics.max_value,
          window.wprevPropertyName
        );
      }

      // Add back as a 2D fill layer with the appropriate coloring
      map.addLayer({
        id: "public.hex350_grid_cardio_view-layer",
        type: "fill",
        source: "geobase_tile_source",
        "source-layer": "public.hex350_grid_cardio_view",
        paint: {
          "fill-color": colorExpression,
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255, 255, 255, 1)",
        },
        filter: ["==", "$type", "Polygon"],
      });
    }
  }

  // Re-enable chart refreshing after the transition
  setTimeout(() => {
    shouldRefreshChart = true;
  }, 1200);
}

// Function to toggle between global and current stats
function toggleStats(type) {
  if (type === "global") {
    switchToGlobalStats();
  } else {
    switchToCurrentStats();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Info panel and modal handling
  const infoPanel = document.getElementById("info-panel");
  const infoToggle = document.getElementById("info-toggle");
  const modal = document.getElementById("info-modal");
  const closeBtn = modal.querySelector(".modal-close");

  // Update info toggle click handler to show modal instead of panel
  infoToggle.addEventListener("click", function() {
    modal.classList.add("show");
    infoToggle.classList.remove("active");
  });

  // Modal close handlers
  closeBtn.addEventListener("click", function() {
    modal.classList.remove("show");
  });

  // Close modal when clicking outside
  modal.addEventListener("click", function(e) {
    if (e.target === modal) {
      modal.classList.remove("show");
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && modal.classList.contains("show")) {
      modal.classList.remove("show");
    }
  });

  // Stats panel toggle
  const statsPanel = document.getElementById("stats-panel");
  const statsToggle = document.getElementById("stats-toggle");

  statsToggle.addEventListener("click", function () {
    const isVisible = statsPanel.style.display !== "none";
    statsPanel.style.display = isVisible ? "none" : "block";
    statsToggle.classList.toggle("active", !isVisible);
  });

  // Difference view toggle
  const diffViewToggle = document.getElementById("diff-view-toggle");
  const showDiffToggle = document.getElementById("show-diff-toggle");

  diffViewToggle.addEventListener("click", function () {
    // Toggle the checkbox state
    showDiffToggle.checked = !showDiffToggle.checked;

    // Update the button state
    diffViewToggle.classList.toggle("active", showDiffToggle.checked);

    // Apply the difference view
    toggleDifferenceView();

    // Make the difference info visible if showing difference view
    document.getElementById("map-diff-info").style.display =
      showDiffToggle.checked ? "block" : "none";
  });

  // 3D view toggle
  const view3DToggle = document.getElementById("view-3d-toggle");

  view3DToggle.addEventListener("click", function () {
    toggle3DView();
    view3DToggle.classList.toggle("active");
  });

  // Initially hide the info panel since we're using modal now
  infoPanel.style.display = "none";

  // Set initial state of the stats panel
  statsPanel.style.display = "block";
  statsToggle.classList.add("active");
});

