import axios from "axios";

const AUTH_URL = process.env.REACT_APP_AUTH_SERVICE;
const INCIDENT_URL = process.env.REACT_APP_INCIDENT_SERVICE;
const DISPATCH_URL = process.env.REACT_APP_DISPATCH_SERVICE;
const ANALYTICS_URL = process.env.REACT_APP_ANALYTICS_SERVICE;

const getToken = () => localStorage.getItem("accessToken");

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

// Auth
export const login = (data) => axios.post(`${AUTH_URL}/auth/login`, data);
export const getProfile = () =>
  axios.get(`${AUTH_URL}/auth/profile`, authHeaders());
export const refreshToken = (data) =>
  axios.post(`${AUTH_URL}/auth/refresh-token`, data);

// Incidents
export const createIncident = (data) =>
  axios.post(`${INCIDENT_URL}/incidents`, data, authHeaders());
export const getOpenIncidents = () =>
  axios.get(`${INCIDENT_URL}/incidents/open`, authHeaders());
export const getIncident = (id) =>
  axios.get(`${INCIDENT_URL}/incidents/${id}`, authHeaders());
export const updateIncidentStatus = (id, status) =>
  axios.put(
    `${INCIDENT_URL}/incidents/${id}/status`,
    { status },
    authHeaders(),
  );
export const getResponders = () =>
  axios.get(`${INCIDENT_URL}/responders`, authHeaders());
export const createResponder = (data) =>
  axios.post(`${INCIDENT_URL}/responders`, data, authHeaders());

// Vehicles
export const getVehicles = () =>
  axios.get(`${DISPATCH_URL}/vehicles`, authHeaders());
export const getVehicleLocation = (id) =>
  axios.get(`${DISPATCH_URL}/vehicles/${id}/location`, authHeaders());
export const registerVehicle = (data) =>
  axios.post(`${DISPATCH_URL}/vehicles/register`, data, authHeaders());

// Analytics
export const getResponseTimes = () =>
  axios.get(`${ANALYTICS_URL}/analytics/response-times`, authHeaders());
export const getIncidentsByRegion = () =>
  axios.get(`${ANALYTICS_URL}/analytics/incidents-by-region`, authHeaders());
export const getResourceUtilization = () =>
  axios.get(`${ANALYTICS_URL}/analytics/resource-utilization`, authHeaders());
