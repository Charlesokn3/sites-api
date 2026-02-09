const express = require("express");
const cors = require("cors");

require("dotenv").config();

const dataService = require("./data-service.js");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Listening",
    term: "Winter 2026",
    student: "Charles Okonkwo",
    learnID: "cokonkwo8"
  });
});
// add a new site
app.post("/api/sites", async (req, res) => {
  try {
    const newSite = await dataService.addNewSite(req.body);
    res.status(201).json(newSite);
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to add site" });
  }
});
// get sites based on filter
app.get("/api/sites", async (req, res) => {
  const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;

  // page/perPage are required and numeric per spec
  const pageNum = parseInt(page, 10);
  const perPageNum = parseInt(perPage, 10);

  if (isNaN(pageNum) || isNaN(perPageNum)) {
    return res.status(400).json({ message: "page and perPage must be valid numbers" });
  }

  try {
    const sites = await dataService.getAllSites(
      pageNum,
      perPageNum,
      name,
      description,
      year ? parseInt(year, 10) : undefined,
      town,
      provinceOrTerritoryCode
    );
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to fetch sites" });
  }
});

// get site by _id
app.get("/api/sites/:id", async (req, res) => {
  try {
    const site = await dataService.getSiteById(req.params.id);

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json(site);
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to fetch site" });
  }
});

// update site by _id
app.put("/api/sites/:id", async (req, res) => {
  try {
    const result = await dataService.updateSiteById(req.body, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to update site" });
  }
});

// delete site by _id
app.delete("/api/sites/:id", async (req, res) => {
  try {
    await dataService.deleteSiteById(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to delete site" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

// Start server
let initialized = false;

async function initOnce() {
  if (!initialized) {
    await dataService.initialize();
    initialized = true;
  }
}
// Ensure DB is initialized before any route runs
app.use(async (req, res, next) => {
  try {
    await initOnce();
    next();
  } catch (err) {
    res.status(500).json({ message: err.message || "Database initialization failed" });
  }
});
// Only listen locally
if (process.env.VERCEL !== "1") {
  dataService.initialize()
    .then(() => {
      app.listen(HTTP_PORT, () => {
        console.log(`server listening on: ${HTTP_PORT}`);
      });
    })
    .catch((err) => console.log(err));
}

module.exports = app;