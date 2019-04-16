// require dependencies
var express = require("express");
var mongoose = require("mongoose");
// Require axios and cheerio. This makes the scraping possible
var axios = require("axios");
var cheerio = require("cheerio");

var exphbs = require("express-handlebars");

// Set PORT
var PORT = process.env.PORT || 3000;

// Require all models
var db = require("./models");

// initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// use promises with Mongo and connect to the database
mongoose.Promise = Promise;
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);
console.log(MONGODB_URI);

// use handlebars
app.engine("handlebars", exphbs({
    defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// get all articles from the database that are not saved
app.get("/", function (req, res) {

    db.Article.find({
        saved: false
    },

        function (error, dbArticle) {
            if (error) {
                console.log(error);
            } else {
                res.render("index", {
                    articles: dbArticle
                });
            }
        })
})

// Routes

// First, tell the console what server.js is doing
console.log("\n************************************\n" +
    "Scrape from www.worldsurfleague.com:" +
    "\n************************************\n");

app.get("/scrape", function (req, res) {
    // Making a request via axios for WSL homepage.
    // The page's Response is passed as the promise argument.
    axios.get("http://www.worldsurfleague.com/").then(function (response) {

        // Load the Response into cheerio and save it to a variable
        // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
        var $ = cheerio.load(response.data);

        // An empty array to save the data that we'll scrape
        var results = [];

        // With cheerio, find each p-tag with the "title" class
        // (i: iterator. element: the current element)
        $("div.content-card-text").each(function (i, element) {

            // In the currently selected element, look at its child elements (<p>),
            // Save the text of the element in a "title" variable
            var title = $(element)
                .children("p")
                .text()
                .trim();

            // In the currently selected element, look at its child elements (<a>),
            // then save the values for any "href" attributes that the child elements may have
            var link = $(element)
                .children("a")
                .attr("href");

            // Save these results in an object that we'll push into the results array we defined earlier
            results.push({
                title: title,
                link: link
            });
        });
        // Log the results once you've looped through each of the elements found with cheerio
        console.log(results);
        console.log("\n");
        res.send("Scrape Complete");
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + "localhost:" + PORT);
});