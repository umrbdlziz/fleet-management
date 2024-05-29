const express = require("express");
const app = express();
const db = require("../models/connectdb");
const { getRackLayout } = require("./warehouse");
const { fleet } = require("./fleet");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/all_orders", async (req, res) => {
  const sql = "SELECT * FROM retrieve";
  const result = await db.executeAllSQL(sql, []);
  res.send(result);
});

app.post("/add_order", async (req, res) => {
  let message = "uploaded successfully";
  const orderlist = req.body.slice(4);

  // to get customer in csv
  const movementData = req.body.slice(0, 1);
  const customer = movementData[0][1];

  // to get so number in csv
  const so_noData = req.body.slice(1, 2);
  const so_no = so_noData[0][2];

  // to get date in csv
  const dateData = req.body.slice(2, 3);
  const date = dateData[0][2];

  // check if the order is already in the orderlist
  try {
    const sql = "SELECT so_no FROM retrieve";
    const old_so_no = await db.executeAllSQL(sql, []);

    for (let old_so of old_so_no) {
      if (old_so.so_no === so_no) {
        res.json({ message: "Order already exist" });
        return;
      }
    }
  } catch (error) {
    console.log(error);
  }

  for (let order of orderlist) {
    let item_code = order[1];
    const item_desc = order[2];
    const quantity = order[3];
    const uom = order[4];

    // Convert item_code to a string
    item_code = item_code.toString();

    try {
      // add new order to orderist
      const sql =
        "INSERT INTO retrieve (customer, so_no, date, item_code, item_desc, item_quantity, uom, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const params = [
        customer,
        so_no,
        date,
        item_code,
        item_desc,
        quantity,
        uom,
        0,
      ];
      await db.executeRunSQL(sql, params);
    } catch (err) {
      // console.error(err.message); // ignore the repeated order_id
      message = err.message;
    }
  }
  res.json({ message: message }); // no use for now
});

app.delete("/delete_order/:id", async (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM retrieve WHERE id = ?";
  await db.executeRunSQL(sql, [id]);
  res.json({ message: "Order deleted" });
});

app.post("/get_storage", async (req, res) => {
  const { station, action, user } = req.body;
  let pigeonhole = {};
  let layout = {};
  let storage = {};
  let message = "";

  // get the station type
  const stationSQL = "SELECT type FROM station WHERE station_id = ?";
  const stationResult = await db.executeGetSQL(stationSQL, [station]);

  // get order list
  const numberSQL = "SELECT DISTINCT so_no FROM retrieve WHERE status = 0";
  const numberResult = await db.executeAllSQL(numberSQL, []);

  if (stationResult.type === "pigeonhole") {
    for (let number of numberResult) {
      const orderSQL = "SELECT * FROM retrieve WHERE so_no = ? AND status = 0";
      const orderResult = await db.executeAllSQL(orderSQL, [number.so_no]);

      let counter = 0;
      let tempData = {};

      for (let order of orderResult) {
        const pigeonholeSQL = "SELECT * FROM pigeonhole WHERE item_code LIKE ?";
        const pigeonholeResult = await db.executeGetSQL(pigeonholeSQL, [
          `%${order.item_code}%`,
        ]);

        if (pigeonholeResult) {
          // Split the item_code string into an array and count the occurrences of each item code
          const itemCodes = pigeonholeResult.item_code.split(",");
          const itemCount = itemCodes.reduce((acc, code) => {
            acc[code] = (acc[code] || 0) + 1;
            return acc;
          }, {});

          // Check if the quantity in the order matches the count of the item code in the pigeonhole
          if (itemCount[order.item_code] >= order.item_quantity) {
            // Split the pigeonhole_id into an array
            const pigeonholeIdParts = pigeonholeResult.pigeonhole_id.split("-");

            // Get the first two parts
            const part1 = pigeonholeIdParts[0]; // "R1"
            const part2 = pigeonholeIdParts[1]; // "S1"

            // Create a key from part1 and part2
            const key = `${part1}-${part2}`;

            // If the key already exists, append the pigeonhole_id to the existing array
            // If it doesn't exist, create a new array with the pigeonhole_id
            tempData[key] = tempData[key]
              ? [...tempData[key], pigeonholeResult.pigeonhole_id]
              : [pigeonholeResult.pigeonhole_id];

            counter++;
          }
        }
      }

      // Check if all the item_code in a so_no are in the pigeonhole
      if (counter === orderResult.length) {
        pigeonhole[number.so_no] = tempData;

        for (let rack in tempData) {
          const [rack_id, side] = rack.split("-");
          fleet(action, rack_id, side);
          layout = await getRackLayout(rack_id);
          layout === "undefined" && (message = "Rack layout not found");
          break;
        }
      }
    }
  }

  res.json({ pigeonhole, layout, message, storage });
});

app.post("/get_item", async (req, res) => {
  const { so_number, pigeonhole } = req.body;
  const itemArray = [];
  try {
    const itemCodeSQL = "SELECT item_code FROM retrieve WHERE so_no = ?";
    const itemCodeResult = await db.executeAllSQL(itemCodeSQL, [so_number]);

    const pigeonholeSQL =
      "SELECT item_code FROM pigeonhole WHERE pigeonhole_id = ?";
    const pigeonholeResult = await db.executeGetSQL(pigeonholeSQL, [
      pigeonhole,
    ]);

    if (pigeonholeResult) {
      const itemCodes = pigeonholeResult.item_code.split(",");

      for (let itemCode of itemCodeResult) {
        if (itemCodes.includes(itemCode.item_code)) {
          const itemImgSQL = "SELECT * FROM item WHERE item_code = ?";
          const itemImgResult = await db.executeGetSQL(itemImgSQL, [
            itemCode.item_code,
          ]);

          itemArray.push(itemImgResult);
        }
      }
      res.json({ items: itemArray });
    } else {
      console.log("Wrong pigeonhole");
    }
  } catch (error) {
    console.log(error);
  }
});

app.get("/get_ratrieve_rack", async (req, res) => {
  const station_id = req.query.station_id;

  const retrieveRackSQL =
    "SELECT retrieve_rack_id FROM station WHERE station_id = ?";
  const retrieveRackresult = await db.executeGetSQL(retrieveRackSQL, [
    station_id,
  ]);

  const rackLayoutSQL =
    "SELECT * FROM retrieve_rack WHERE retrieve_rack_id = ?";
  const rackLayoutResult = await db.executeGetSQL(rackLayoutSQL, [
    retrieveRackresult.retrieve_rack_id,
  ]);

  res.json(rackLayoutResult);
});

app.get("/get_bin", async (req, res) => {
  const so_no = req.query.so_no;
  const binSQL = "SELECT position, bin_id FROM retrieve_bin WHERE so_no = ?";
  const binResult = await db.executeGetSQL(binSQL, [so_no]);

  res.json(binResult);
});

app.post("/update_retrieve", async (req, res) => {
  const { dataSend, so_number, pigeonholeId } = req.body;

  try {
    for (let data of dataSend) {
      const { item_code, quantity } = data;

      // Fetch the item from the retrieve table
      const retrieveSQL =
        "SELECT item_code, item_quantity FROM retrieve WHERE so_no = ? AND item_code = ?";
      const retrieveResult = await db.executeGetSQL(retrieveSQL, [
        so_number,
        item_code,
      ]);

      if (retrieveResult) {
        // Fetch the item codes from the pigeonhole table
        const quantitySQL =
          "SELECT item_code FROM pigeonhole WHERE pigeonhole_id = ?";
        const quantityResult = await db.executeGetSQL(quantitySQL, [
          pigeonholeId,
        ]);

        if (quantityResult && quantityResult.item_code) {
          const updatedItemCodeList = removeItemCodes(
            quantityResult.item_code,
            item_code,
            quantity
          );

          // Update the pigeonhole table with the new item_code list
          const updatePigeonholeSQL =
            "UPDATE pigeonhole SET item_code = ? WHERE pigeonhole_id = ?";
          await db.executeRunSQL(updatePigeonholeSQL, [
            updatedItemCodeList,
            pigeonholeId,
          ]);

          // Update the retrieve table
          const updateRetrieveSQL =
            "UPDATE retrieve SET status = true, datetime_retrieve = datetime('now') WHERE item_code = ? AND so_no = ?";
          await db.executeRunSQL(updateRetrieveSQL, [
            retrieveResult.item_code,
            so_number,
          ]);
        }
      }
    }

    res.json({ message: "Order updated" });
  } catch (error) {
    console.error("Error updating retrieve:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Function to remove a specified item code a given number of times from a comma-separated string
function removeItemCodes(itemCodes, itemCode, quantity) {
  const array = itemCodes.split(",");
  let count = 0;

  const updatedArray = array.filter((code) => {
    if (code === itemCode && count < quantity) {
      count++;
      return false;
    }
    return true;
  });

  return updatedArray.join(",");
}

module.exports = app;
