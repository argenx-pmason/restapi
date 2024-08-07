import "./App.css";
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  AppBar,
  Toolbar,
  TextField,
  IconButton,
} from "@mui/material";
// import { DataGridPro, GridToolbar } from "@mui/x-data-grid-pro";
import { Info } from "@mui/icons-material";
import convert from "xml-js";
import { LicenseInfo } from "@mui/x-license-pro";
import { getDir, xmlToJson } from "./utility";
const App = () => {
  LicenseInfo.setLicenseKey(
    "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
  );
  const title = "LSAF REST API testing",
    innerHeight = window.innerHeight,
    urlPrefix = window.location.protocol + "//" + window.location.host,
    { href } = window.location,
    mode = href.startsWith("http://localhost") ? "local" : "remote",
    server = href.split("//")[1].split("/")[0],
    // webDavPrefix = urlPrefix + "/lsaf/webdav/repo",
    // fileViewerPrefix = `https://${server}/lsaf/filedownload/sdd:/general/biostat/tools/fileviewer/index.html?file=`,
    [openInfo, setOpenInfo] = useState(false),
    [token, setToken] = useState(null),
    [encryptedPassword, setEncryptedPassword] = useState(null),
    [rows, setRows] = useState([
      { id: 1, name: "John", age: 30, city: "New York" },
      { id: 2, name: "Jane", age: 25, city: "Chicago" },
    ]),
    [cols, setCols] = useState([
      { field: "id", headerName: "ID", width: 100 },
      { field: "name", headerName: "Name", width: 200 },
      { field: "age", headerName: "Age", width: 100 },
      { field: "city", headerName: "City", width: 200 },
    ]),
    encryptPassword = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api/encrypt",
        myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Basic " + btoa(username + ":" + password)
        // cG1hc29uOlJ1dGgtODI0ODkx
      );
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url, requestOptions)
        .then((response) => response.text())
        .then((result) => {
          console.log(result);
          setEncryptedPassword(result);
        })
        .catch((error) => console.error(error));
    },
    [username, setUsername] = useState("pmason"),
    [password, setPassword] = useState(""),
    logon = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api/logon",
        myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Basic " + btoa(username + ":" + password)
      );
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url, requestOptions)
        .then((response) => {
          const authToken = response.headers.get("x-auth-token");
          console.log("authToken", authToken, "response", response);
          setToken(authToken);
        })
        .catch((error) => console.error(error));
    },
    [submitStatus, setSubmitStatus] = useState(null),
    [submissionId, setSubmissionId] = useState(null),
    submitJob = () => {
      const url =
          // "https://xarprod.ondemand.sas.com/lsaf/api//repository/files/",
          "https://xarprod.ondemand.sas.com/lsaf/api",
        jobPath =
          "/jobs/repository/general/biostat/jobs/gadam_ongoing_studies/dev/jobs/sdtm_part1.job",
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", token);
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url + jobPath + "?action=run", requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          console.log("responseJson", responseJson);
          setSubmitStatus(responseJson?.status);
          setSubmissionId(responseJson?.submissionId);
        })
        .catch((error) => console.error(error));
    },
    [jobStatus, setJobStatus] = useState(null),
    getJobStatus = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api",
        apiRequest = `/jobs/submissions/${submissionId}/status`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", token);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          const status = responseJson?.type + " (" + responseJson?.code + ")";
          console.log("responseJson", responseJson, "status", status);
          setJobStatus(status);
        })
        .catch((error) => console.error(error));
    },
    [pathManifest, setPathManifest] = useState(null),
    getPathManifest = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api",
        apiRequest = `/jobs/submissions/${submissionId}/manifest`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", token);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          const path = responseJson?.path;
          console.log("responseJson", responseJson, "path", path);
          setPathManifest(path);
        })
        .catch((error) => console.error(error));
    },
    [log, setLog] = useState(null),
    getManifest = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api",
        apiRequest = `/repository/files/${pathManifest}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", token);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.text();
        })
        .then((responseXML) => {
          console.log("responseXML", responseXML);
          const dataJSON = convert.xml2js(responseXML, {
            compact: true,
            spaces: 4,
          });
          console.log("dataJSON", dataJSON);
          const jm = dataJSON["job-manifest"],
            { job } = jm,
            { logs } = job,
            { log } = logs,
            rf = log["repository-file"],
            { _text } = rf;
          setLog(_text);
        })
        .catch((error) => console.error(error));
    },
    [fileContents, setFileContents] = useState(null),
    getFileContents = () => {
      const url = "https://xarprod.ondemand.sas.com/lsaf/api",
        apiRequest = `/repository/files/${log}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", token);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.text();
        })
        .then((responseText) => {
          console.log("responseText", responseText);
          setFileContents(responseText);
        })
        .catch((error) => console.error(error));
    };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar variant="dense" sx={{ backgroundColor: "#f7f7f7" }}>
          <Box
            sx={{
              border: 1,
              borderRadius: 2,
              color: "black",
              fontWeight: "bold",
              boxShadow: 3,
              fontSize: 14,
              height: 23,
              padding: 0.3,
            }}
          >
            &nbsp;&nbsp;{title}&nbsp;&nbsp;
          </Box>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Tooltip title="Information about this screen">
            <IconButton
              color="info"
              // sx={{ mr: 2 }}
              onClick={() => {
                setOpenInfo(true);
              }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Grid sx={{ mt: 8 }} container>
        <Grid item xs={12}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
          <TextField
            label="Password"
            value={password}
            type="password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <br />
          <Button onClick={() => encryptPassword()}>
            Get Encrypted Password
          </Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Encrypted Password: {encryptedPassword}
          </Box>
          <Button onClick={() => logon()}>Logon & get token</Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>Token: {token}</Box>
          <Button onClick={() => submitJob()}>Submit job</Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Status:{" "}
            <b>
              {submitStatus
                ? submitStatus.type + " (" + submitStatus.code + ")"
                : null}
            </b>
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Submission ID: {submissionId ? submissionId : null}
          </Box>
          <Button onClick={() => getJobStatus()}>Check job status</Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Job status: <b>{jobStatus ? jobStatus : null}</b>
          </Box>
          <Button onClick={() => getPathManifest()}>
            Get path to manifest
          </Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Manifest path: <b>{pathManifest ? pathManifest : null}</b>
          </Box>
          <Button onClick={() => getManifest()}>Get manifest file</Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Log path extracted from manifest XML:{" "}
            <code>{log ? log : null}</code>
          </Box>
          <Button onClick={() => getFileContents()}>
            Get contents of Log file
          </Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Log: <code>{fileContents ? fileContents : null}</code>
          </Box>
          {/*   <Box sx={{ height: innerHeight - 50, width: "100%" }}>
            <DataGridPro
              autoHeight={true}
              rows={rows}
              columns={cols}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                },
              }}
              // sx={{ "& .MuiDataGrid-row": { fontSize: fontSize } }}
            />
          </Box>*/}
        </Grid>
      </Grid>
      {/* Dialog with General info about this screen */}
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenInfo(false)}
        open={openInfo}
      >
        <DialogTitle>Info about this screen</DialogTitle>
        <DialogContent>
          <Box sx={{ color: "blue", fontSize: 11 }}>Description goes here.</Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default App;
