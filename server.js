/********************************************************************************
*  WEB422 – Assignment 3
* 
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
*  Name: _Charles_Okonkwo______ Student ID: _102817244____ Date: __07/04/2026___
*
*  Published URL (of the API) on Vercel:  https://sites-api-charles.vercel.app
*
********************************************************************************/


const express = require("express");
const cors = require("cors");
require("dotenv").config();

const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");

const dataService = require("./data-service");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// JWT / Passport Setup
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    return done(null, jwt_payload);
  })
);

app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({
    message: "A3 – Secured API Listening",
    term: "Winter 2026",
    student: "Charles Okonkwo",
    learnID: "cokonkwo8"
  });
});

/* USER ROUTES */

// Register user (public)
app.post("/api/user/register", async (req, res) => {
  try {
    const msg = await dataService.registerUser(req.body);
    res.json({ message: msg });
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

// Login user (public)
app.post("/api/user/login", async (req, res) => {
  try {
    const user = await dataService.checkUser(req.body);

    const payload = {
      _id: user._id,
      userName: user.userName
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({
      message: "Login successful",
      token: token
    });
  } catch (err) {
    res.status(401).json({ message: err });
  }
});

// Get favourites (protected)
app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.getFavourites(req.user._id);
      res.json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// Add favourite (protected)
app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.addFavourite(
        req.user._id,
        req.params.id
      );
      res.json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// Remove favourite (protected)
app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.removeFavourite(
        req.user._id,
        req.params.id
      );
      res.json(data);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

/*SITES ROUTES (API)*/

// Add site (protected)
app.post(
  "/api/sites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const site = await dataService.addNewSite(req.body);
      res.status(201).json(site);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get all sites (public)
app.get("/api/sites", async (req, res) => {
  const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;

  const pageNum = parseInt(page);
  const perPageNum = parseInt(perPage);

  if (isNaN(pageNum) || isNaN(perPageNum)) {
    return res.status(400).json({ message: "page and perPage must be numbers" });
  }

  try {
    const sites = await dataService.getAllSites(
      pageNum,
      perPageNum,
      name,
      description,
      year ? parseInt(year) : undefined,
      town,
      provinceOrTerritoryCode
    );
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get site by ID (public)
app.get("/api/sites/:id", async (req, res) => {
  try {
    const site = await dataService.getSiteById(req.params.id);

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update site (protected)
app.put(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const result = await dataService.updateSiteById(req.body, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Delete site (protected)
app.delete(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await dataService.deleteSiteById(req.params.id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

// Start Server
dataService.initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server listening on port ${HTTP_PORT}`);
    });
  })
  .catch(err => console.log(err));

module.exports = app;
