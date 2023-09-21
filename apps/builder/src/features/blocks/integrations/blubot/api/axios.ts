import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://blubot-api.onrender.com',
})