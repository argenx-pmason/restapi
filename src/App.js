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
  IconButton,
  Tabs,
  Tab,
  Grid,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import convert from "xml-js";
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
    params = new URLSearchParams(document.location.search),
    job = params.get("job"),
    run = params.get("run"),
    wait = params.get("wait"),
    every = params.get("every"),
    fileViewerPrefix = `https://${server}/lsaf/filedownload/sdd:/general/biostat/tools/fileviewer/index.html?file=`,
    logViewerPrefix = `https://${server}/lsaf/filedownload/sdd:/general/biostat/tools/logviewer/index.html?log=`,
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
      while (!thisStatus.startsWith("COMPLETED")) {
        console.log("completed", thisStatus);
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
      const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        redirect: "follow",
      };
      setJobRunning(true);
      return fetch(
        url + "/jobs/repository" + useJob + "?action=run",
        requestOptions
      )
        .then((response) => {
          console.log("submitJob - response", response);
          return response.json();
        })
        .then((responseJson) => {
          console.log("submitJob - responseJson", responseJson);
          setSubmitStatus(responseJson?.status);
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
            { output } = outputs,
            output_files = output.map((o) => o["repository-file"]._text),
            char_parm = parameters["character-parameter"],
            folder_parm = parameters["folder-parameter"],
            { program } = programs,
            rf_prog = program["repository-file"],
            { _text: prog_path } = rf_prog,
            { log } = logs,
            rf_log = log["repository-file"],
            { _text: log_path } = rf_log,
            { result } = results,
            repositoryFile = result["repository-file"],
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
          console.log("getFileContents - response", response);
          return response.text();
        })
        .then((responseText) => {
          console.log("getFileContents - responseText", responseText);
          setFileContents(responseText);
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
            <Tab label="Step by step" value="1" />
            <Tab label="Automated" value="2" />
            <Tab label="Improved" value="3" />
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
            <Link href={logViewerPrefix + log} target="_blank">
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
              <Link href={fileViewerPrefix + pathManifest} target="_blank">
                {pathManifest}
              </Link>
            )}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff" }}>
            Log path extracted from manifest XML:{" "}
            {log && (
              <Link href={logViewerPrefix + log} target="_blank">
                {log}
              </Link>
            )}
            <br />
            Path to results extracted from manifest XML:{" "}
            {resultFile && (
              <Link href={fileViewerPrefix + resultFile} target="_blank">
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
            <Grid item md={6}>
              <Box sx={{ m: 1, mt: 2 }}>
                Pressing Submit Job will do the following: Logon with encrypted
                password, Get token, Submit job, Check status until complete
                (every 2 secs), Get manifest, Show links to manifest items.
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
            <Grid item md={6}>
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

          <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
            <b>Token: </b>
            {token}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
            <b>Status: </b>
            {submitStatus
              ? submitStatus.type + " (" + submitStatus.code + ")"
              : null}
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
            <b>Submission ID: </b>
            {submissionId || null}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
            <b>Job status: </b>
            {jobStatus || null}
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
            <b>Time taken: </b>
            {timeTaken || null}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
            <b>View manifest: </b>
            {pathManifest && (
              <Link href={fileViewerPrefix + pathManifest} target="_blank">
                {pathManifest}
              </Link>
            )}
          </Box>
          <Box sx={{ backgroundColor: "#f7f7f7", mt: 1 }}>
            <b>Open Log Viewer: </b>
            {log && (
              <Link href={logViewerPrefix + log} target="_blank">
                {log}
              </Link>
            )}
          </Box>
          <Box sx={{ backgroundColor: "#e6f2ff", mt: 1 }}>
            <b>View results: </b>
            {resultFile && (
              <Link href={fileViewerPrefix + resultFile} target="_blank">
                {resultFile}
              </Link>
            )}
            <hr />
            {outputFiles && (
              <Box sx={{ backgroundColor: "#f7f7f7", fontWeight: "bold" }}>
                Outputs:
              </Box>
            )}
            <List dense>
              {outputFiles &&
                outputFiles.map((o, i) => {
                  let prefix = fileViewerPrefix;
                  if (o.includes(".log")) prefix = logViewerPrefix;
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
