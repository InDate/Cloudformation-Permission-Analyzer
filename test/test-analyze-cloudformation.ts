import { exec } from 'child_process';
import * as fs from 'fs';

// Define the path to the CloudFormation template and the analyze script
const analyzeScriptPath = './analyze-cloudformation.ts';
const sampleTemplate = './test/example.yaml'
// Sample CloudFormation YAML template

// Execute the analyze script
exec(`npx ts-node ${analyzeScriptPath} ${sampleTemplate}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing script: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Error in script execution: ${stderr}`);
    return;
  }
  console.log(`Script output:\n${stdout}`);
});
