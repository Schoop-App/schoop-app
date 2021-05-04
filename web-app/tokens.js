let accessToken;
let refreshToken;

const setAccessToken = newVal => {
  accessToken = newVal;
};

const setRefreshToken = newVal => {
  refreshToken = newVal;
};

const getAccessToken = () => accessToken;
const getRefreshToken = () => refreshToken;

module.exports = {
  setAccessToken,
  setRefreshToken,
  getAccessToken,
  getRefreshToken
};
