const path = require("path");
const lti = require("ltijs").Provider;
const Database = require("ltijs-sequelize");
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const fs = require("fs");

/* mongoose.connect(
  "mongodb+srv://admin:admin@cluster0.bbcecoy.mongodb.net/database?retryWrites=true&w=majority&appName=Cluster0"
); */
const db = new Database("db", "root", "root", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

lti.setup(
  "LTIKEY",
  {
    plugin: db, // Passing db object to plugin field
  },
  {
    appRoute: "/",
    loginRoute: "/login",
    cookies: {
      secure: false,
      sameSite: "",
    },
    devMode: true,
  }
);

lti.onConnect((token, req, res) => {
  console.log("Requisição do lançamento: ", req);
  console.log("Termino do lançamento");
  const filePath = path.join(__dirname, "gradeform.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Ocorreu um erro");
      return;
    }
    res.send(data);
  });
});

lti.app.post("/grade", async (req, res) => {
  console.log("Requisição da grade: ", req);
  console.log("Termino da requisição");
  try {
    const idtoken = res.locals.token; // IdToken
    const score = req.body.grade;
    console.log("Aqui começa o idToken", idtoken);
    console.log("Score", score);
    const gradeObj = {
      userId: idtoken.user,
      scoreGiven: score,
      scoreMaximum: 100,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
    };

    // Selecting linetItem ID
    let lineItemId = idtoken.platformContext.endpoint.lineitem; // Attempting to retrieve it from idtoken
    if (!lineItemId) {
      const response = await lti.Grade.getLineItems(idtoken, {
        resourceLinkId: true,
      });
      const lineItems = response.lineItems;
      if (lineItems.length === 0) {
        // Creating line item if there is none
        console.log("Creating new line item");
        const newLineItem = {
          scoreMaximum: 100,
          label: "Grade",
          tag: "grade",
          resourceLinkId: idtoken.platformContext.resource.id,
        };
        const lineItem = await lti.Grade.createLineItem(idtoken, newLineItem);
        lineItemId = lineItem.id;
      } else lineItemId = lineItems[0].id;
    }

    const responseGrade = await lti.Grade.submitScore(
      idtoken,
      lineItemId,
      gradeObj
    );
    return res.send(responseGrade);
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
});

const setup = async () => {
  await lti.deploy({ port: 3000 });

  await lti.registerPlatform({
    url: "http://200.131.248.11/",
    name: "Tecnocomp",
    clientId: "3InwtLlFi3wdpIg",
    authenticationEndpoint: "http://200.131.248.11/mod/lti/auth.php",
    accesstokenEndpoint: "http://200.131.248.11/mod/lti/token.php",
    authConfig: {
      method: "JWK_SET",
      key: "http://200.131.248.11/mod/lti/certs.php",
    },
  });
};
setup();
