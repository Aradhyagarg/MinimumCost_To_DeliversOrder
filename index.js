const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8000;

const productsInfo = {
  "A": { "location": "C1", "mass": 3 },
  "B": { "location": "C1", "mass": 2 },
  "C": { "location": "C1", "mass": 8 },
  "D": { "location": "C2", "mass": 12 },
  "E": { "location": "C2", "mass": 25 },
  "F": { "location": "C2", "mass": 15 },
  "G": { "location": "C3", "mass": 0.5 },
  "H": { "location": "C3", "mass": 1 },
  "I": { "location": "C3", "mass": 2 }
};

const productsList = Object.keys(productsInfo);

const dist = {
  "C1": { "C2": 4, "L1": 3 },
  "C2": { "C1": 4, "L1": 2.5, "C3": 3 },
  "C3": { "L1": 2, "C2": 3 },
  "L1": { "C1": 3, "C2": 2.5, "C3": 2 }
};

app.use(express.json());
app.use(cors());

// Input validation middleware
app.use((req, res, next) => {
  const order = req.body;
  const invalidProducts = Object.keys(order).filter(product => !productsList.includes(product));

  if (invalidProducts.length > 0) {
    return res.status(400).json({ error: `Invalid product identifiers: ${invalidProducts.join(', ')}` });
  }

  const negativeQuantities = Object.entries(order).filter(([_, quantity]) => quantity < 0);

  if (negativeQuantities.length > 0) {
    return res.status(400).json({ error: `Negative quantities not allowed: ${negativeQuantities.map(([product]) => product).join(', ')}` });
  }

  next();
});

app.post('/MinimumCostToDeliversOrder', (req, res) => {
  const order = req.body;

  const centersToPickup = new Set();
  const weightOfProducts = new Map();
  weightOfProducts.set("L1", 0);

  productsList.forEach((item) => {
    if (order[item] !== 0) {
      const location = productsInfo[item].location;
      centersToPickup.add(location);
      if (weightOfProducts.has(location)) {
        weightOfProducts.set(location, weightOfProducts.get(location) + productsInfo[item].mass * order[item]);
      } else {
        weightOfProducts.set(location, productsInfo[item].mass * order[item]);
      }
    }
  });

  let maxCost = 0;
  let startCenter = "";

  for (const item of centersToPickup) {
    if (maxCost < dist[item]["L1"]) {
      maxCost = Math.max(maxCost, dist[item]["L1"]);
      startCenter = item;
    }
  }

  const q = new Array();
  q.push(startCenter);

  let totalCost = 0;

  while (q.length > 0) {
    const currentCenter = q.shift();
    const nextCenters = Object.keys(dist[currentCenter]);
    let nextCenter = "";
    let nextCenterCost = Infinity;

    nextCenters.forEach((location) => {
      if (centersToPickup.has(location) && location !== "L1" && nextCenterCost > dist[currentCenter][location]) {
        nextCenterCost = dist[currentCenter][location];
        nextCenter = location;
      } else if (location === "L1" && nextCenterCost > dist[currentCenter]["L1"]) {
        nextCenterCost = dist[currentCenter]["L1"];
        nextCenter = "L1";
      }
    });

    const currentMass = weightOfProducts.get(currentCenter);

    if (currentMass % 5 === 0 && currentMass / 5 > 0) {
      totalCost += (10 + 8 * (Math.floor(currentMass / 5) - 1)) * nextCenterCost;
    } else if (currentMass % 5 !== 0) {
      totalCost += (10 + 8 * Math.floor(currentMass / 5)) * nextCenterCost;
    } else {
      totalCost += 10 * nextCenterCost;
    }

    centersToPickup.delete(currentCenter);
    if (centersToPickup.size === 0) break;

    q.push(nextCenter);
  }

  res.status(200).json({ "Min Cost": totalCost });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`);
});