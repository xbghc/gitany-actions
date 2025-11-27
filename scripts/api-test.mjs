#!/usr/bin/env node
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import https from 'https';
import { homedir } from 'os';
import { join } from 'path';

dotenv.config();

function getToken() {
  if (process.env.GITCODE_TOKEN) return process.env.GITCODE_TOKEN;

  const configPath = join(homedir(), '.config', 'gitcode', 'config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (config.token) return config.token;
  }

  throw new Error('未找到 GITCODE_TOKEN (检查环境变量、.env 或 ~/.config/gitcode/config.json)');
}

const url = process.argv[2];

const token = getToken();

https
  .get(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      });
    },
  )
  .on('error', (err) => {
    console.error('请求失败:', err.message);
    process.exit(1);
  });
