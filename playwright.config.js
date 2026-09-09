import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.js',timeout:90000,use:{channel:'msedge',headless:true,viewport:{width:1440,height:1000}},reporter:'list'});
