const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const siteSchema = require("./modules/siteSchema");
const userSchema = require("./modules/userSchema");

let mongoDBConnectionString = process.env.MONGO_URL;

let Site;
let User;

/*************************
 * Database Initialization
 *************************/
module.exports.initialize = function () {
  return new Promise(function (resolve, reject) {
    const db = mongoose.createConnection(mongoDBConnectionString);

    db.on('error', err => reject(err));

    db.once('open', () => {
      Site = db.model("sites", siteSchema);
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

/*SITES FUNCTIONS*/
module.exports.addNewSite = async function (data) {
  const newSite = new Site(data);
  await newSite.save();
  return newSite;
};

module.exports.getAllSites = async function (
  page,
  perPage,
  name,
  description,
  year,
  town,
  provinceOrTerritoryCode
) {
  let findBy = {};

  if (name) {
    findBy.siteName = { $regex: name, $options: "i" };
  }
  if (description) {
    findBy.description = { $regex: description, $options: "i" };
  }
  if (year) {
    findBy["dates.year"] = year;
  }
  if (town) {
    findBy["location.town"] = { $regex: town, $options: "i" };
  }
  if (provinceOrTerritoryCode) {
    findBy["provinceOrTerritory.code"] = provinceOrTerritoryCode;
  }

  return Site.find(findBy)
    .sort({ siteName: 1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec();
};

module.exports.getSiteById = async function (id) {
  return Site.findById(id).exec();
};

module.exports.updateSiteById = async function (data, id) {
  return Site.updateOne({ _id: id }, { $set: data }).exec();
};

module.exports.deleteSiteById = async function (id) {
  return Site.deleteOne({ _id: id }).exec();
};

/*USER FUNCTIONS*/
module.exports.registerUser = function (userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
    } else {
      bcrypt.hash(userData.password, 10)
        .then(hash => {
          userData.password = hash;
          let newUser = new User(userData);

          newUser.save()
            .then(() => resolve(`User ${userData.userName} successfully registered`))
            .catch(err => {
              if (err.code === 11000) {
                reject("User Name already taken");
              } else {
                reject("Error creating the user: " + err);
              }
            });
        })
        .catch(err => reject(err));
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise((resolve, reject) => {
    User.findOne({ userName: userData.userName })
      .exec()
      .then(user => {
        bcrypt.compare(userData.password, user.password).then(result => {
          if (result) resolve(user);
          else reject("Incorrect password for user " + userData.userName);
        });
      })
      .catch(() => reject("Unable to find user " + userData.userName));
  });
};

module.exports.getFavourites = function (id) {
  return User.findById(id)
    .exec()
    .then(user => user.favourites);
};

module.exports.addFavourite = function (id, favId) {
  return User.findByIdAndUpdate(
    id,
    { $addToSet: { favourites: favId } },
    { new: true }
  )
    .exec()
    .then(user => user.favourites);
};

module.exports.removeFavourite = function (id, favId) {
  return User.findByIdAndUpdate(
    id,
    { $pull: { favourites: favId } },
    { new: true }
  )
    .exec()
    .then(user => user.favourites);
};