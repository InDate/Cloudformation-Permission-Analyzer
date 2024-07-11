import * as fs from 'fs';
import * as YAML from 'js-yaml';

interface PermissionMap {
  [resourceType: string]: string[];
}

interface CloudFormationResource {
  Type: string;
  Properties?: { [key: string]: any };
}

interface CloudFormationTemplate {
  Resources: { [key: string]: CloudFormationResource };
}

// Load permission map from JSON file
const permissionMap: PermissionMap = JSON.parse(fs.readFileSync('permission-map.json', 'utf8'));

const customSchema = YAML.DEFAULT_SCHEMA.extend([
  new YAML.Type('!Ref', { kind: 'scalar', construct: data => ({ 'Ref': data }) }),
  new YAML.Type('!Sub', { kind: 'scalar', construct: data => ({ 'Fn::Sub': data }) }),
  new YAML.Type('!GetAtt', {
    kind: 'scalar',
    construct: data => ({ 'Fn::GetAtt': data.split('.') })
  }),
  new YAML.Type('!GetAtt', {
    kind: 'sequence',
    construct: data => ({ 'Fn::GetAtt': data })
  }),
  new YAML.Type('!Join', { kind: 'sequence', construct: data => ({ 'Fn::Join': data }) }),
  new YAML.Type('!FindInMap', { kind: 'sequence', construct: data => ({ 'Fn::FindInMap': data }) }),
  new YAML.Type('!If', { kind: 'sequence', construct: data => ({ 'Fn::If': data }) }),
  new YAML.Type('!Equals', { kind: 'sequence', construct: data => ({ 'Fn::Equals': data }) }),
  new YAML.Type('!And', { kind: 'sequence', construct: data => ({ 'Fn::And': data }) }),
  new YAML.Type('!Or', { kind: 'sequence', construct: data => ({ 'Fn::Or': data }) }),
  new YAML.Type('!Not', { kind: 'sequence', construct: data => ({ 'Fn::Not': data }) }),
  new YAML.Type('!Base64', { kind: 'mapping', construct: data => ({ 'Fn::Base64': data }) }),

]);

function parseTemplate(filePath: string): CloudFormationTemplate {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return YAML.load(fileContent, { schema: customSchema }) as CloudFormationTemplate;
}

function analyzeTemplate(template: CloudFormationTemplate): { permissions: Set<string>; missingMappings: Set<string> } {
  const permissions = new Set<string>();
  const missingMappings = new Set<string>();

  if (!template.Resources) {
    throw new Error('No resources found in the CloudFormation template.');
  }

  for (const resource of Object.values(template.Resources)) {
    const resourceType = resource.Type;
    const resourcePermissions = permissionMap[resourceType];

    if (resourcePermissions) {
      resourcePermissions.forEach(permission => permissions.add(permission));
    } else {
      missingMappings.add(resourceType);
    }
  }

  return { permissions, missingMappings };
}

function generatePolicy(permissions: Set<string>): string {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: Array.from(permissions),
        Resource: '*'
      }
    ]
  };

  return JSON.stringify(policy, null, 2);
}

async function main() {
  const templatePath = process.argv[2];

  if (!templatePath) {
    console.error('Usage: npx ts-node analyze-cloudformation.ts <path-to-template.yaml>');
    process.exit(1);
  }

  const template = parseTemplate(templatePath);
  const { permissions, missingMappings } = analyzeTemplate(template);
  const policy = generatePolicy(permissions);

  console.log('Generated IAM Policy:');
  console.log(policy);

  if (missingMappings.size > 0) {
    console.warn('Missing mappings for the following resource types:');
    missingMappings.forEach(resourceType => console.warn(resourceType));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
