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

const dataService = require("./data-service.js");

const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");

const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    done(null, jwt_payload);
  })
);
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// ensure the model is initialized before any route runs
let initialized = false;
async function initOnce() {
  if (!initialized) {
    await dataService.initialize();
    initialized = true;
  }
}

app.use(async (req, res, next) => {
  try {
    await initOnce();
    next();
  } catch (err) {
    res.status(500).json({ message: err.message || "Database initialization failed" });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "A3 - Secured API Listening",
    term: "Winter 2026",
    student: "Charles Okonkwo",
    learnID: "cokonkwo8"
  });
});

// register a new user
app.post("/api/user/register", async (req, res) => {
  try {
    const msg = await dataService.registerUser(req.body);
    res.json({ message: msg });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

// login user
app.post("/api/user/login", async (req, res) => {
  try {
    const user = await dataService.checkUser(req.body);
    const payload = {
      _id: user._id,
      userName: user.userName
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.json({
      message: "login successful",
      token: token
    });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

// get user favourites (protected)
app.get("/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.getFavourites(req.user._id);
      res.json(data);
    } catch (err) {
      res.status(422).json({ error: err });
    }
  }
);

// add a favourite (protected)
app.put("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.addFavourite(req.user._id, req.params.id);
      res.json(data);
    } catch (err) {
      res.status(422).json({ error: err });
    }
  }
);

// remove a favourite (protected)
app.delete("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await dataService.removeFavourite(req.user._id, req.params.id);
      res.json(data);
    } catch (err) {
      res.status(422).json({ error: err });
    }
  }
);


// add a new site (PROTECTED)
app.post(
  "/api/sites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const newSite = await dataService.addNewSite(req.body);
      res.status(201).json(newSite);
    } catch (err) {
      res.status(500).json({ message: err.message || "Unable to add site" });
    }
  }
);

// get sites (PUBLIC)
app.get("/api/sites", async (req, res) => {
  const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;

  const pageNum = parseInt(page);
  const perPageNum = parseInt(perPage);

  if (isNaN(pageNum) || isNaN(perPageNum)) {
    return res.status(400).json({ message: "page and perPage must be valid numbers" });
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
    res.status(500).json({ message: err.message || "Unable to fetch sites" });
  }
});

// get site by id (PUBLIC)
app.get("/api/sites/:id", async (req, res) => {
  try {
    const site = await dataService.getSiteById(req.params.id);
    if (!site) return res.status(404).json({ message: "Site not found" });
    res.json(site);
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to fetch site" });
  }
});

// update site (PROTECTED)
app.put(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const result = await dataService.updateSiteById(req.body, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message || "Unable to update site" });
    }
  }
);

// delete site (PROTECTED)
app.delete(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await dataService.deleteSiteById(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message || "Unable to delete site" });
    }
  }
);

/* ===== 404 ===== */
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

/* ===== listen locally ===== */
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
