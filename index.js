const express = require("express");
const cors = require("cors");
const connection = require("./config/db");
const Workflow = require("./models/Workflow");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");



const app = express();

app.use(cors());
app.use(express.json());


// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await connection;
    console.log("connected to database");
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.log("Error connecting to database");
    console.log(error);
  }
});

// Save a new workflow
app.post("/api/workflows/save", async (req, res) => {
  try {
    const { workflowId, nodes, edges } = req.body;
    const workflow = new Workflow({ workflowId, nodes, edges });
    await workflow.save();
    res.status(200).send({ message: "WorkFlow added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Load all workflow Ids
app.get('/api/workflows/ids', async (req, res) => {
  try {
    const workflowIds = await Workflow.find().distinct('workflowId');
    res.status(200).json(workflowIds);
  } catch (error) {
    console.error("Error fetching workflow IDs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Load a workflow by its ID
app.get("/api/workflows/load/:workflowId", async (req, res) => {
  try {
    const workflowId = req.params.workflowId;
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      return res.status(404).send({ error: "Workflow not found" });
    }
    res.status(200).send({ message: "Workflow found", nodes: workflow.nodes, edges: workflow.edges });

  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});


// Middleware to handle file uploads
const upload = multer({ dest: "uploads/" });


app.post("/api/workflows/execute", upload.single("file"), async (req, res) => {
  try {
    // Step 1: Read the uploaded CSV file
    const uploadedFilePath = req.file.path;
    const data = [];

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(uploadedFilePath)
        .pipe(csv())
        .on("data", (row) => {
          data.push(row);
        })
        .on("end", () => {
          // Success: CSV file read successfully
          resolve();
        })
        .on("error", (error) => {
          // Failure: Error occurred while reading CSV file
          reject(error);
        });
    });

    // Step 2: Convert names to lowercase
    data.forEach((row) => {
      if (row.Name) {
        row.Name = row.Name.toLowerCase();
      }
    });

    // Step 3: Send the modified data back to the frontend
    res.status(200).send({ data });

    // Step 4: Clean up - delete the uploaded file
    fs.unlinkSync(uploadedFilePath);
  } catch (error) {
    // Failure: Error occurred during workflow execution
    console.error("Error executing workflow:", error);
    res.status(500).send({ error: "Error executing workflow." });
  }
});

app.post("/api/convert-to-json", (req, res) => {
  // Assuming outputData is sent from the frontend
  const { outputData } = req.body;

  if (!outputData || outputData.length === 0) {
    return res.status(400).json({ error: "No data to convert" });
  }

  try {
    // Convert outputData to JSON
    const jsonData = JSON.stringify(outputData, null, 2);
    
    // You can also save jsonData to a file or do further processing here
    
    res.json({ jsonOutput: jsonData });
  } catch (error) {
    console.error("Error converting data to JSON:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/wait-for-10-seconds", (req, res) => {
  // Simulate a delay of 10 seconds
  setTimeout(() => {
    res.status(200).send({ message: "Waited for 10 seconds" });
  }, 5000);
});


module.exports = router;
