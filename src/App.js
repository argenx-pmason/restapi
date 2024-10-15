import "./App.css";
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  AppBar,
  Toolbar,
  TextField,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import convert from "xml-js";
import { LicenseInfo } from "@mui/x-license";
const App = () => {
  LicenseInfo.setLicenseKey(
    "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
  );
  const title = "LSAF REST API testing",
    { host } = window.location,
    realhost = host.includes("sharepoint") ? "xarprod.ondemand.sas.com" : host,
    api = "https://" + realhost + "/lsaf/api",
    innerHeight = window.innerHeight,
    [openInfo, setOpenInfo] = useState(false),
    [token, setToken] = useState(null),
    [encryptedPassword, setEncryptedPassword] = useState(null),
    encryptPassword = () => {
      const url = api + "/encrypt",
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
    [jobPath, setJobPath] = useState(
      "/jobs/repository/general/biostat/jobs/gadam_ongoing_studies/dev/jobs/sdtm_part1.job"
    ),
    [username, setUsername] = useState("pmason"),
    [password, setPassword] = useState(""),
    [timeTaken, setTimeTaken] = useState(0),
    // logon with unencrypted password
    logon = () => {
      const url = api + "/logon",
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
    // logon with encrypted password, submit job, wait & check status
    logon2 = async () => {
      const url = api + "/logon",
        myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Basic " + btoa(username + ":" + encryptedPassword)
      );
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url, requestOptions)
        .then(async (response) => {
          const authToken = response.headers.get("x-auth-token");
          console.log("authToken", authToken, "response", response);
          setToken(authToken);
          const subId = await submitJob(authToken);
          await waitTillJobCompletes(subId, authToken);
          await otherSteps(subId, authToken);
        })
        .catch((error) => console.error(error));
    },
    sleep = (t) => new Promise((r) => setTimeout(r, t)),
    waitTillJobCompletes = async (subId, tok) => {
      // loop until job status is completed or failed or cancelled
      let thisStatus = "";
      // set time now
      const startTime = new Date().getTime();
      console.log("subId", subId, "submissionId", submissionId, "tok", tok);
      while (thisStatus !== "COMPLETED (30300)") {
        // console.log("submissionId", submissionId);
        //TODO - wait till we have a sumission ID
        await sleep(3000);
        thisStatus = await getJobStatus(subId, tok);
        console.log("thisStatus", thisStatus);
        if (thisStatus === "failed" || thisStatus === "cancelled") {
          break;
        }
        // work out time from start to now
        const endTime = new Date().getTime(),
          timeDiff = endTime - startTime,
          // convert timediff to seconds
          seconds = timeDiff / 1000;
        console.log("seconds", seconds);
        setTimeTaken(seconds);
        if (seconds > 60) {
          break;
        }
      }
    },
    otherSteps = async (subId, tok) => {
      const pathMan = await getPathManifest(subId, tok);
      console.log("pathMan", pathMan);
      const res = await getManifest(tok, pathMan);
      console.log("res", res);
      getFileContents(tok, res);
    },
    [tabValue, setTabValue] = useState("1"),
    handleChangeTab = (event, newValue) => {
      setTabValue(newValue);
    },
    [submitStatus, setSubmitStatus] = useState(null),
    [submissionId, setSubmissionId] = useState(null),
    submitJob = (passedToken) => {
      const url =
          // api+"//repository/files/",
          api,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", passedToken || token);
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        redirect: "follow",
      };

      return fetch(url + jobPath + "?action=run", requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          console.log("responseJson", responseJson);
          setSubmitStatus(responseJson?.status);
          setSubmissionId(responseJson?.submissionId);
          return responseJson?.submissionId;
        })
        .catch((error) => console.error(error));
    },
    [jobStatus, setJobStatus] = useState(null),
    getJobStatus = (subId, tok) => {
      console.log("subId", subId, "submissionId", submissionId, "tok", tok);
      if (!submissionId && !subId) {
        return "no submission ID";
      }
      const useSubmissionId = subId || submissionId,
        useToken = tok || token,
        url = api,
        apiRequest = `/jobs/submissions/${useSubmissionId}/status`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };
      console.log("useSubmissionId", useSubmissionId, "useToken", useToken);

      return fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          const status = responseJson?.type + " (" + responseJson?.code + ")";
          console.log("responseJson", responseJson, "status", status);
          setJobStatus(status);
          return status;
        })
        .catch((error) => console.error(error));
    },
    [pathManifest, setPathManifest] = useState(null),
    getPathManifest = (subId, tok) => {
      const useSubmissionId = subId || submissionId,
        useToken = tok || token,
        url = api,
        apiRequest = `/jobs/submissions/${useSubmissionId}/manifest`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      return fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("response", response);
          return response.json();
        })
        .then((responseJson) => {
          const path = responseJson?.path;
          console.log("responseJson", responseJson, "path", path);
          setPathManifest(path);
          return path;
        })
        .catch((error) => console.error(error));
    },
    [log, setLog] = useState(null),
    [resultFile, setResultFile] = useState(null),
    getManifest = (tok, pathMan) => {
      const useToken = tok || token,
        useManifest = pathMan || pathManifest,
        url = api,
        apiRequest = `/repository/files/${useManifest}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      return fetch(url + apiRequest, requestOptions)
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
            { logs, results } = job,
            { log } = logs,
            rf = log["repository-file"],
            { _text } = rf,
            { result } = results,
            repositoryFile = result["repository-file"],
            { _text: _resultFile } = repositoryFile;
          setLog(_text);
          setResultFile(_resultFile);
          return _resultFile;
        })
        .catch((error) => console.error(error));
    },
    [fileContents, setFileContents] = useState(null),
    getFileContents = (tok, file) => {
      const useToken = tok || token,
        useFile = file || log,
        url = api,
        apiRequest = `/repository/files/${useFile}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
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
          <Tabs value={tabValue} onChange={handleChangeTab}>
            <Tab label="Step by step" value="1" />
            <Tab label="Automated" value="2" />
          </Tabs>
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
      <Box sx={{ mt: 9 }} hidden={tabValue !== "1"}>
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
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          Encrypted Password: {encryptedPassword}
        </Box>
        <Button onClick={() => logon()}>Logon & get token</Button>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>Token: {token}</Box>
        <TextField
          label="Path to Job"
          value={jobPath}
          onChange={(e) => {
            setJobPath(e.target.value);
          }}
          sx={{ mt:3, width: 800 }}
        />
        <Button onClick={() => submitJob()}>Submit job</Button>
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          Status:{" "}
          <b>
            {submitStatus
              ? submitStatus.type + " (" + submitStatus.code + ")"
              : null}
          </b>
        </Box>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>
          Submission ID: {submissionId || null}
        </Box>
        <Button onClick={() => getJobStatus()}>Check job status</Button>
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          Job status: <b>{jobStatus || null}</b>
        </Box>
        <Button onClick={() => getPathManifest()}>Get path to manifest</Button>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>
          Manifest path: <b>{pathManifest || null}</b>
        </Box>
        <Button onClick={() => getManifest()}>Get manifest file & extract path to SAS log</Button>
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          Log path extracted from manifest XML: <code>{log || null}</code>
        </Box>
        <Button onClick={() => getFileContents()}>
          Get contents of Log file
        </Button>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>
          Log: <code>{fileContents || null}</code>
        </Box>
      </Box>
      <Box sx={{ mt: 9 }} hidden={tabValue !== "2"}>
        <Box sx={{ height: innerHeight - 50, width: "100%" }}>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Using username: <b>{username}</b>
            <br />
            Using encrypted Password: <b>{encryptedPassword}</b>
          </Box>
          <TextField
            label="Path to Job"
            value={jobPath}
            onChange={(e) => {
              setJobPath(e.target.value);
            }}
            sx={{ mt:2,  width: 800 }}
          />
          <ul>
            <li>Logon with encrypted password</li>
            <li>Get token</li>
            <li>Submit job</li>
            <li>Wait 3 secs</li>
            <li>Check status until complete</li>
            <li>Get manifest</li>
            <li>Get path to results</li>
            <li>Get results</li>
          </ul>
          <Button onClick={() => logon2()}>Go</Button>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>Token: {token}</Box>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Status:{" "}
            <b>
              {submitStatus
                ? submitStatus.type + " (" + submitStatus.code + ")"
                : null}
            </b>
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Submission ID: {submissionId || null}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Job status: <b>{jobStatus || null}</b>
            <br />
            Time taken: <b>{timeTaken || null}</b>
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7" }}>
            Manifest path: <b>{pathManifest || null}</b>
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Log path extracted from manifest XML:{" "}
            <code>{log ? log : null}</code>
            <br />
            Path to results extracted from manifest XML:{" "}
            <code>{resultFile ? resultFile : null}</code>
          </Box>
          <Box sx={{ backgroundColor: "#ffffe6" }}>
            <br />
            <code>{fileContents || null}</code>
          </Box>
        </Box>
      </Box>
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
