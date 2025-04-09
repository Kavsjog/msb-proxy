const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/oversvamning", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!lat || !lon) {
    return res.status(400).json({ error: "Måste ange lat och lon" });
  }

  const buffer = 0.001;
  const minx = lon - buffer;
  const miny = lat - buffer;
  const maxx = lon + buffer;
  const maxy = lat + buffer;

  const url = `https://gis-services.msb.se/arcgis/services/risks/oversvamningshot/MapServer/WFSServer?service=WFS&version=1.1.0&request=GetFeature&typeName=oversvamningshot:oversvamningszoner&bbox=${minx},${miny},${maxx},${maxy}`;

  try {
    const xmlResponse = await axios.get(url);
    xml2js.parseString(xmlResponse.data, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "XML-tolkning misslyckades" });
      }

      const featureCollection = result["wfs:FeatureCollection"];
      const featureMember = featureCollection && featureCollection["gml:featureMember"];
      const feature = featureMember && featureMember[0];

      if (!feature) {
        return res.json({ riskzon: false });
      }

      const props = feature["oversvamningshot:oversvamningszoner"][0];
      const riskklass = props["oversvamningshot:riskklass"] && props["oversvamningshot:riskklass"][0] || "Okänd";
      const typ = props["oversvamningshot:orsak"] && props["oversvamningshot:orsak"][0] || "Okänd";

      return res.json({
        riskzon: true,
        riskklass,
        typ
      });
    });
  } catch (error) {
    return res.status(500).json({
      error: "WFS-förfrågan misslyckades",
      detaljer: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servern körs på port ${PORT}`);
});
