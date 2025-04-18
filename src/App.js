import "./App.css";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  AppBar,
  Link,
  List,
  ListItem,
  Toolbar,
  TextField,
  ButtonGroup,
  IconButton,
  Tabs,
  Tab,
  Grid,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import convert from "xml-js";
import demoJson from "./demo.json";
import { LicenseInfo } from "@mui/x-license";
const App = () => {
  LicenseInfo.setLicenseKey(
    "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
  );
  const title = "LSAF REST API testing",
    { host, href } = window.location;
  let realhost;
  if (host.includes("sharepoint")) {
    realhost = "xarprod.ondemand.sas.com";
  } else if (host.includes("localhost")) {
    realhost = "xarprod.ondemand.sas.com";
  } else {
    realhost = host;
  }
  const server = href.split("//")[1].split("/")[0],
    // mode = href.startsWith("http://localhost") ? "local" : "remote",
    // webDavPrefix = urlPrefix + "/lsaf/webdav/repo",
    // parmRef = useRef(),
    params = new URLSearchParams(document.location.search),
    job = params.get("job"),
    run = params.get("run"),
    wait = params.get("wait"),
    every = params.get("every"),
    fileViewerPrefix = `https://${server}/lsaf/filedownload/sdd:/general/biostat/apps/fileviewer/index.html?file=`,
    logViewerPrefix = `https://${server}/lsaf/filedownload/sdd:/general/biostat/apps/logviewer/index.html?log=`,
    repoPrefix = `https://${server}/lsaf/webdav/`,
    api = "https://" + realhost + "/lsaf/api",
    // urlPrefix = window.location.protocol + "//" + window.location.host,
    // apiRef = useGridApiRef(),
    innerHeight = window.innerHeight,
    [openInfo, setOpenInfo] = useState(false),
    [token, setToken] = useState(null),
    [maxWaitSecs, setMaxWaitSecs] = useState(600),
    [checkSecs, setCheckSecs] = useState(5),
    [encryptedPassword, setEncryptedPassword] = useState(null),
    [jobRunning, setJobRunning] = useState(false),
    [parmsToUse, setParmsToUse] = useState(""),
    [repo, setRepo] = useState("repository"), // repository or workspace
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
          console.log("encryptPassword" + result);
          setEncryptedPassword(result);
          localStorage.setItem("username", username);
          localStorage.setItem("encryptedPassword", result);
        })
        .catch((error) => console.error(error));
    },
    [jobPath, setJobPath] = useState(null),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [timeTaken, setTimeTaken] = useState(0),
    [jsonResponse, setJsonResponse] = useState(null),
    // logon with unencrypted password
    logon = () => {
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
        .then((response) => {
          const authToken = response.headers.get("x-auth-token");
          console.log("logon - authToken", authToken, "response", response);
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
          console.log("logon2 - authToken", authToken, "response", response);
          setToken(authToken);
          const subId = await submitJob(authToken);
          await waitTillJobCompletes(subId, authToken);
          await otherSteps(subId, authToken);
        })
        .catch((error) => console.error(error));
    },
    // logon with encrypted password, submit job, wait & check status
    logon3 = async (storedUsername, storedEncryptedPassword, passedJob) => {
      const url = api + "/logon",
        myHeaders = new Headers(),
        useUsername = storedUsername || username,
        useEncryptedPassword = storedEncryptedPassword || encryptedPassword,
        useJob = passedJob || jobPath;

      myHeaders.append(
        "Authorization",
        "Basic " + btoa(useUsername + ":" + useEncryptedPassword)
      );
      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
      };

      fetch(url, requestOptions)
        .then(async (response) => {
          const authToken = response.headers.get("x-auth-token");
          console.log("logon3 - authToken", authToken, "response", response);
          setToken(authToken);
          const subId = await submitJob(authToken, useJob);
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
      console.log(
        "waitTillJobCompletes - subId",
        subId,
        "submissionId",
        submissionId,
        "tok",
        tok
      );
      while (
        !thisStatus.startsWith("COMPLETED") &&
        !thisStatus.startsWith("FAILED")
      ) {
        console.log("thisStatus", thisStatus);
        //TODO - wait till we have a sumission ID
        await sleep(checkSecs * 1000);
        thisStatus = await getJobStatus(subId, tok);
        console.log("waitTillJobCompletes - thisStatus", thisStatus);
        if (thisStatus === "failed" || thisStatus === "cancelled") {
          break;
        }
        // work out time from start to now
        const endTime = new Date().getTime(),
          timeDiff = endTime - startTime,
          // convert timediff to seconds
          seconds = timeDiff / 1000;
        console.log("waitTillJobCompletes - seconds", seconds);
        setTimeTaken(seconds);
        if (seconds > maxWaitSecs) {
          break;
        }
      }
    },
    otherSteps = async (subId, tok) => {
      const pathMan = await getPathManifest(subId, tok);
      console.log("otherSteps - pathMan", pathMan);
      const res = await getManifest(tok, pathMan);
      console.log("otherSteps - res", res);
      getFileContents(tok, res);
    },
    [tabValue, setTabValue] = useState("3"),
    handleChangeTab = (event, newValue) => {
      setTabValue(newValue);
    },
    [submitStatus, setSubmitStatus] = useState(null),
    [submissionId, setSubmissionId] = useState(null),
    clearFields = () => {
      // setToken(null);
      document.title = "Ready";
      setSubmitStatus(null);
      setSubmissionId(null);
      setJobStatus(null);
      setTimeTaken(0);
      setPathManifest(null);
      setLog(null);
      setResultFile(null);
      setOutputFiles(null);
    },
    submitJob = (passedToken, passedJob) => {
      const useJob = passedJob || jobPath;
      console.log(
        "submitJob - jobPath",
        jobPath,
        "passedJob",
        passedJob,
        "token",
        token
      );
      clearFields();
      const url =
          // api+"//repository/files/",
          api,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", passedToken || token);
      myHeaders.append("Content-Type", "application/json");
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        redirect: "follow",
        // headers: {
        //   "X-Auth-Token": passedToken || token,
        //   "Content-Type": "application/json",
        // },
        body: parmsToUse,
      };
      setJobRunning(true);
      console.log(useJob, url + `/jobs/${repo}` + useJob + "?action=run");
      return fetch(
        url + "/jobs/" + repo + useJob + "?action=run",
        requestOptions
      )
        .then((response) => {
          console.log("submitJob - response", response);
          return response.json();
        })
        .then((responseJson) => {
          console.log("submitJob - responseJson", responseJson);
          setSubmitStatus(responseJson?.status);
          if (responseJson?.status === "FAILED") setJobRunning(false);
          document.title =
            responseJson?.status?.type +
            " (" +
            responseJson?.status?.code +
            ")";
          setSubmissionId(responseJson?.submissionId);
          return responseJson?.submissionId;
        })
        .catch((error) => {
          console.error(error);
          setJobRunning(false);
        });
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
      console.log(
        "getJobStatus - useSubmissionId",
        useSubmissionId,
        "useToken",
        useToken
      );

      return fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("getJobStatus - response", response);
          return response.json();
        })
        .then((responseJson) => {
          const status = responseJson?.type + " (" + responseJson?.code + ")";
          console.log(
            "getJobStatus - responseJson",
            responseJson,
            "status",
            status
          );
          setJobStatus(status);
          document.title = status;
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
      setJobRunning(false);

      return fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("getPathManifest - response", response);
          return response.json();
        })
        .then((responseJson) => {
          const path = responseJson?.path;
          console.log(
            "getPathManifest - responseJson",
            responseJson,
            "path",
            path
          );
          setPathManifest(path);
          return path;
        })
        .catch((error) => console.error(error));
    },
    [log, setLog] = useState(null),
    [resultFile, setResultFile] = useState(null),
    [outputFiles, setOutputFiles] = useState(null),
    getManifest = (tok, pathMan) => {
      const useToken = tok || token,
        useManifest = pathMan || pathManifest,
        url = api,
        apiRequest = `/${repo}/files/${useManifest}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };

      return fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("getManifest - response", response);
          return response.text();
        })
        .then((responseXML) => {
          console.log("getManifest - responseXML", responseXML);
          const dataJSON = convert.xml2js(responseXML, {
            compact: true,
            spaces: 4,
          });
          console.log("getManifest - dataJSON", dataJSON);
          const jm = dataJSON["job-manifest"],
            { job } = jm,
            { logs, results, inputs, outputs, parameters, programs } = job,
            { input } = inputs,
            { output } = outputs,
            output_files = output.map((o) => {
              const out =
                repo === "repository"
                  ? o["repository-file"]._text
                  : o["workspace-file"]._text;
              return out;
            }),
            char_parm = parameters["character-parameter"],
            folder_parm = parameters["folder-parameter"],
            { program } = programs,
            rf_prog =
              repo === "repository"
                ? program["repository-file"]
                : program["workspace-file"],
            { _text: prog_path } = rf_prog,
            { log } = logs,
            rf_log =
              repo === "repository"
                ? log["repository-file"]
                : log["workspace-file"],
            { _text: log_path } = rf_log,
            { result } = results,
            repositoryFile =
              repo === "repository"
                ? result["repository-file"]
                : result["workspace-file"],
            { _text: repository_path } = repositoryFile;
          console.log(
            "getManifest - log_path",
            log_path,
            "repository_path",
            repository_path,
            "prog_path",
            prog_path,
            "char_parm",
            char_parm,
            "folder_parm",
            folder_parm,
            "output_files",
            output_files
          );
          setLog(log_path);
          setResultFile(repository_path);
          setOutputFiles(output_files);
          return repository_path;
        })
        .catch((error) => console.error(error));
    },
    [fileContents, setFileContents] = useState(null),
    getFileContents = (tok, file) => {
      const useToken = tok || token,
        useFile = file || log,
        url = api,
        apiRequest = `/${repo}/files/${useFile}?component=contents`,
        myHeaders = new Headers();
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      };
      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("getFileContents - response", response);
          return response.text();
        })
        .then((responseText) => {
          console.log("getFileContents - responseText", responseText);
          setFileContents(responseText);
        })
        .catch((error) => console.error(error));
    },
    writeSampleJson = (tok) => {
      const useToken = tok || token,
        useFile = "/general/biostat/jobs/utils/dev/output/demo.json",
        url = api,
        apiRequest = `/${repo}/files/${useFile}?action=upload`,
        myHeaders = new Headers(),
        formdata = new FormData(),
        jsonString = JSON.stringify(demoJson),
        blob = new Blob([jsonString], { type: "application/json" });

      formdata.append("file", blob, "demo.json");
      myHeaders.append("X-Auth-Token", useToken);
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        redirect: "follow",
        body: formdata,
      };
      fetch(url + apiRequest, requestOptions)
        .then((response) => {
          console.log("writeSampleJson - response", response);
          return response.text();
        })
        .then((responseText) => {
          console.log("writeSampleJson - responseText", responseText);
          setJsonResponse(responseText);
        })
        .catch((error) => console.error(error));
    };
  // end of variable & function declarations

  useEffect(() => {
    const tempUsername = localStorage.getItem("username"),
      tempEncryptedPassword = localStorage.getItem("encryptedPassword");
    setUsername(tempUsername);
    setEncryptedPassword(tempEncryptedPassword);
    console.log("params", params, "job", job, "run", run);
    // for (const value of params.values()) {
    //   console.log(value);
    // }
    const _parmsToUse = {};
    for (const key of params.keys()) {
      const value = params.get(key);
      if (key.startsWith("_")) _parmsToUse[key.slice(1)] = value;
      console.log(key, value);
    }
    console.log(
      "_parmsToUse",
      _parmsToUse,
      "JSON.stringify(_parmsToUse)",
      JSON.stringify(_parmsToUse)
    );
    setParmsToUse(JSON.stringify(_parmsToUse));
    // parmRef.current.value = _parmsToUse;
    if (job) {
      setJobPath(job);
    } else
      setJobPath(
        "/general/biostat/jobs/gadam_ongoing_studies/dev/jobs/sdtm_part1.job"
      );
    if (wait) {
      setMaxWaitSecs(wait);
    } else {
      setMaxWaitSecs(600);
    }
    if (every) {
      setCheckSecs(every);
    } else {
      setCheckSecs(5);
    }
    if (["y", "true", "1"].includes(run) || encryptedPassword) {
      logon3(tempUsername, tempEncryptedPassword, job);
    }
  }, []);

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
            <Tab label="Good" value="1" />
            <Tab label="Better" value="2" />
            <Tab label="Best" value="3" />
          </Tabs>
          <ButtonGroup sx={{ mt: 1, ml: 2 }} variant="outlined">
            <Button
              color={repo === "repository" ? "success" : "warning"}
              variant={repo === "repository" ? "contained" : "outlined"}
              size={"small"}
              onClick={async () => {
                setRepo("repository");
              }}
            >
              Repository
            </Button>
            <Button
              color={repo === "workspace" ? "success" : "warning"}
              variant={repo === "workspace" ? "contained" : "outlined"}
              size={"small"}
              onClick={async () => {
                setRepo("workspace");
              }}
            >
              Workspace
            </Button>
          </ButtonGroup>
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
          size="small"
          label="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <TextField
          size="small"
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
          size="small"
          label="Path to Job"
          value={jobPath}
          onChange={(e) => {
            setJobPath(e.target.value);
          }}
          sx={{ mt: 3, width: 800 }}
        />
        <Button onClick={() => submitJob()}>Submit job</Button>
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          <b>Status: </b>
          {submitStatus
            ? submitStatus.type + " (" + submitStatus.code + ")"
            : null}
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
        <Button onClick={() => getManifest()}>
          Get manifest file & extract path to SAS log
        </Button>
        <Box sx={{ backgroundColor: "#e6f2ff" }}>
          Log path extracted from manifest XML:{" "}
          {log && (
            <Link
              href={logViewerPrefix + repoPrefix + repo.slice(0, 4) + log}
              target="_blank"
            >
              {log}
            </Link>
          )}
        </Box>
        <Button onClick={() => getFileContents()}>
          Get contents of Log file
        </Button>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>
          Log: <code>{fileContents || null}</code>
        </Box>
        <Button onClick={() => writeSampleJson()}>
          Write a sample JSON file to server
        </Button>
        <Box sx={{ backgroundColor: "#f7f7f7" }}>
          JSON response: <code>{jsonResponse || null}</code>
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
            size="small"
            label="Path to Job"
            value={jobPath}
            onChange={(e) => {
              setJobPath(e.target.value);
            }}
            sx={{ mt: 2, width: 800 }}
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
            Manifest path:{" "}
            {pathManifest && (
              <Link
                href={
                  fileViewerPrefix +
                  repoPrefix +
                  repo.slice(0, 4) +
                  pathManifest
                }
                target="_blank"
              >
                {pathManifest}
              </Link>
            )}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Log path extracted from manifest XML:{" "}
            {log && (
              <Link
                href={logViewerPrefix + repoPrefix + repo.slice(0, 4) + log}
                target="_blank"
              >
                {log}
              </Link>
            )}
            <br />
            Path to results extracted from manifest XML:{" "}
            {resultFile && (
              <Link
                href={
                  fileViewerPrefix + repoPrefix + repo.slice(0, 4) + resultFile
                }
                target="_blank"
              >
                {resultFile}
              </Link>
            )}
          </Box>
          <Box sx={{ backgroundColor: "#ffffe6" }}>
            <br />
            <code>{fileContents || null}</code>
          </Box>
        </Box>
      </Box>
      <Box sx={{ mt: 9 }} hidden={tabValue !== "3"}>
        <Box sx={{ height: innerHeight - 50, width: "100%" }}>
          <Grid container>
            <Grid item md={12}>
              <Box sx={{ m: 1, mt: 2 }}>
                Pressing Submit Job will do the following: Logon with encrypted
                password, Get token, Submit job, Check status until complete
                (every {checkSecs} secs), Get manifest, Show links to manifest
                items.
              </Box>
            </Grid>
            <Grid item md={12}>
              <Box
                sx={{
                  backgroundColor: encryptedPassword ? "#e6f2ff" : "#ffcc",
                }}
              >
                Using username: <b>{username}</b>
                &nbsp;with encrypted password: <b>{encryptedPassword}</b>
              </Box>
            </Grid>
            {encryptedPassword === null && (
              <Grid item md={3}>
                <TextField
                  size="small"
                  label="Username"
                  value={username}
                  sx={{ mt: 1 }}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                />
              </Grid>
            )}
            {encryptedPassword === null && (
              <Grid item md={3}>
                <TextField
                  size="small"
                  label="Password"
                  value={password}
                  type="password"
                  sx={{ mt: 1 }}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                />
              </Grid>
            )}
            {encryptedPassword === null && (
              <Grid item md={3}>
                <Button
                  variant="contained"
                  size="small "
                  onClick={() => encryptPassword()}
                >
                  Get Encrypted Password
                </Button>
              </Grid>
            )}
            {encryptedPassword === null && (
              <Grid item md={3}>
                <Box sx={{ backgroundColor: "#ffcc" }}>
                  Encrypted Password: {encryptedPassword}
                </Box>
              </Grid>
            )}
            <Grid item md={6}>
              <TextField
                size="small"
                label="Path to Job"
                value={jobPath}
                onChange={(e) => {
                  setJobPath(e.target.value);
                }}
                sx={{ mt: 1, width: "100%" }}
                disabled={jobRunning}
              />
            </Grid>
            <Grid item md={3}>
              <TextField
                size="small"
                label="Max wait time (secs)"
                value={maxWaitSecs}
                sx={{ mt: 1 }}
                onChange={(e) => setMaxWaitSecs(e.target.value)}
                disabled={jobRunning}
              />
            </Grid>
            <Grid item md={3}>
              <TextField
                size="small"
                label="Check every (secs)"
                value={checkSecs}
                sx={{ mt: 1 }}
                onChange={(e) => setCheckSecs(e.target.value)}
                disabled={jobRunning}
              />
            </Grid>
            <Grid item md={9}>
              <Tooltip title="Parameters appear in JSON format and can be edited, as long as you keep valid JSON.">
                <TextField
                  // ref={parmRef}
                  size="small"
                  label="Parms to use"
                  value={parmsToUse}
                  onChange={(e) => {
                    setParmsToUse(e.target.value);
                  }}
                  sx={{ mt: 1, width: "100%" }}
                  disabled={jobRunning}
                />
              </Tooltip>
            </Grid>
            <Grid item md={3}>
              <Button
                variant="contained"
                size="small"
                sx={{ m: 1 }}
                onClick={() => logon3()}
                disabled={jobRunning}
              >
                Submit Job
              </Button>
            </Grid>
          </Grid>

          <Tooltip title="REST API token, which is obtained by logging into LSAF using your username and encrypted password.">
            <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
              <b>Token: </b>
              {token}
            </Box>
          </Tooltip>
          <Tooltip title="After submitting the job we receive a status back.">
            <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
              <b>Status: </b>
              {submitStatus
                ? submitStatus.type + " (" + submitStatus.code + ")"
                : null}
            </Box>
          </Tooltip>
          <Tooltip title="After submitting the job we receive a submission ID back, which is used to get further information about the job that is running.">
            <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
              <b>Submission ID: </b>
              {submissionId || null}
            </Box>
          </Tooltip>
          <Tooltip title="We query the job status every specified number of seconds until it is completed.">
            <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
              <b>Job status: </b>
              {jobStatus || null}
            </Box>
          </Tooltip>
          <Tooltip title="This is updated every time the status is checked, until the job is completed.">
            <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
              <b>Time taken: </b>
              {timeTaken || null}
            </Box>
          </Tooltip>
          <Tooltip title="Link to fileviewer to show the manifest for the job.">
            <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
              <b>View manifest: </b>
              {pathManifest && (
                <Link
                  href={
                    fileViewerPrefix +
                    repoPrefix +
                    repo.slice(0, 4) +
                    pathManifest
                  }
                  target="_blank"
                >
                  {pathManifest}
                </Link>
              )}
            </Box>
          </Tooltip>
          <Tooltip title="Link to view the log from the job with the log viewer app">
            <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
              <b>Open Log Viewer: </b>
              {log && (
                <Link
                  href={logViewerPrefix + repoPrefix + repo.slice(0, 4) + log}
                  target="_blank"
                >
                  {log}
                </Link>
              )}
            </Box>
          </Tooltip>
          <Tooltip title="Link to view the listing of the results from the job.">
            <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
              <b>View results: </b>
              {resultFile && (
                <Link
                  href={
                    fileViewerPrefix +
                    repoPrefix +
                    repo.slice(0, 4) +
                    resultFile
                  }
                  target="_blank"
                >
                  {resultFile}
                </Link>
              )}
              <hr />
              {outputFiles && (
                <Tooltip title="The following links are to each output that the manifest file has listed.">
                  <Box sx={{ backgroundColor: "#f7f7f7", fontWeight: "bold" }}>
                    Outputs:
                  </Box>
                </Tooltip>
              )}
              <List dense>
                {outputFiles &&
                  outputFiles.map((o, i) => {
                    let prefix =
                      fileViewerPrefix + repoPrefix + repo.slice(0, 4);
                    if (o.includes(".log"))
                      prefix = logViewerPrefix + repoPrefix + repo.slice(0, 4);
                    return (
                      <ListItem key={"out" + i}>
                        <Link href={prefix + o} target="_blank">
                          {o}
                        </Link>
                      </ListItem>
                    );
                  })}
              </List>
            </Box>
          </Tooltip>
        </Box>
      </Box>
      {/* Dialog with General info about this screen */}
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenInfo(false)}
        open={openInfo}
      >
        <DialogTitle>Running jobs using the REST API app</DialogTitle>
        <DialogContent>
          <Box sx={{ color: "blue", fontSize: 11 }}>
            This app is used to run a job with the REST API. It requires the
            user to be authenticated having their username and encrypted
            password stored. That then allows REST API calls to occur without
            the user needing to authenticate every time.
            <p />
            <p />
            Parameters can be passed on the URL by prefixing them with an _ and
            then using the parameter name. For example, to pass a parameter
            named study with a value of 123, the URL would have at the end:
            <br />
            <b>
              <code>&_study=123</code>
            </b>
            <p />
            <a
              href="https://xarprod.ondemand.sas.com:8000/lsaf/api/reference"
              target="_blank"
              rel="noopener noreferrer"
            >
              SAS® Life Science Analytics Framework REST API (1.0)
            </a>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default App;
