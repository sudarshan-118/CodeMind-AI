import type { Project, Memory, Standard, Activity } from './types';

export const INITIAL_STANDARDS: Standard[] = [
  {
    id: 'std-1',
    name: 'Use Parameterized Queries',
    description: 'Enforce parameterized queries or ORM usages. Prevent raw string concatenation SQL statements.',
    enabled: true,
    ruleKeyword: 'select * from',
    severity: 'critical'
  },
  {
    id: 'std-2',
    name: 'No Singleton Pattern',
    description: 'Ensure classes use Dependency Injection instead of hardcoded Singleton getters.',
    enabled: true,
    ruleKeyword: 'static getInstance',
    severity: 'warning'
  },
  {
    id: 'std-3',
    name: 'No Hardcoded Secrets',
    description: 'Exposing credentials, Stripe secrets, or passwords in raw source is forbidden.',
    enabled: true,
    ruleKeyword: 'sk_live_',
    severity: 'critical'
  },
  {
    id: 'std-4',
    name: 'No Raw System Calls',
    description: 'Avoid running sub-commands via raw console evaluation such as os.system.',
    enabled: true,
    ruleKeyword: 'os.system',
    severity: 'critical'
  }
];

export const INITIAL_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    issue: 'SQL Injection in user login controller',
    fix: 'Switched raw string interpolation to parameterized prepared query placeholders.',
    outcome: 'SQL Injection issue resolved. Database connection secured.',
    recommendation: 'Use TypeORM or Sequelize query builders, and strictly avoid string interpolation in queries.',
    date: '2026-05-12',
    matchPercentage: 92
  },
  {
    id: 'mem-2',
    issue: 'Hardcoded Stripe API Secret Key in payments.ts',
    fix: 'Moved credential token out of source code and configured dotenv load execution.',
    outcome: 'Credentials removed from repository and secured in vault configs.',
    recommendation: 'Configure environment secret scanners in the CI/CD pipeline to reject credentials in Git.',
    date: '2026-06-01',
    matchPercentage: 88
  },
  {
    id: 'mem-3',
    issue: 'Command injection vulnerability in backup shell command',
    fix: 'Replaced python os.system() invocation with secure array execution via subprocess.run().',
    outcome: 'Input parameters are no longer parsed by shell interpreter. Vulnerability closed.',
    recommendation: 'Always execute subprocesses with token arrays instead of passing single raw strings to shell.',
    date: '2026-06-08',
    matchPercentage: 85
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    text: 'Ingested project "ecommerce-api" from GitHub main branch.',
    type: 'info',
    time: '2 hours ago',
    projectId: 'proj-1'
  },
  {
    id: 'act-2',
    text: 'AI Agent scanned config.ts and flagged 1 CRITICAL SQL injection risk.',
    type: 'critical',
    time: '1.5 hours ago',
    projectId: 'proj-1'
  },
  {
    id: 'act-3',
    text: 'Memory Center registered a new resolution for "Stripe Secret Leak".',
    type: 'success',
    time: '45 mins ago',
    projectId: 'proj-1'
  },
  {
    id: 'act-4',
    text: 'Ingested local repository folder "py-data-pipeline".',
    type: 'info',
    time: '15 mins ago',
    projectId: 'proj-2'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'ecommerce-api',
    description: 'Core TypeScript API for online shop ordering, payments, and authentication.',
    language: 'TypeScript',
    status: 'ready',
    overallScore: 74,
    securityScore: 65,
    architectureScore: 78,
    performanceScore: 82,
    maintainabilityScore: 71,
    branch: 'main',
    commitHash: '8f7a31b',
    files: [
      {
        id: 'file-1-1',
        projectId: 'proj-1',
        name: 'auth.ts',
        path: 'src/auth.ts',
        isDir: false,
        riskState: 'critical',
        dependencies: ['src/database.ts', 'src/user.service.ts'],
        code: `import { db } from "./database";
import { User } from "./user.service";

export function loginUser(req: any, res: any) {
  const { username, password } = req.body;
  
  // CRITICAL: SQL Injection vulnerability - raw string interpolation
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
  
  db.query(query, (err: any, user: any) => {
    if (err) return res.status(500).send("Database error");
    if (!user) return res.status(401).send("Invalid credentials");
    return res.status(200).json({ token: "JWT_SECRET_MOCK" });
  });
}`,
        issues: [
          {
            id: 'issue-1-1-1',
            line: 7,
            type: 'SQL Injection',
            severity: 'critical',
            explanation: 'User input from req.body is directly concatenated into a SQL statement. An attacker can break the SQL syntax and gain unauthorized access or corrupt database records.',
            recommendedFix: `// Parameterized queries resolve SQL Injection
const query = "SELECT * FROM users WHERE username = ? AND password = ?";
db.query(query, [username, password], (err: any, user: any) => { ... });`,
            applied: false
          }
        ]
      },
      {
        id: 'file-1-2',
        projectId: 'proj-1',
        name: 'payment.ts',
        path: 'src/payment.ts',
        isDir: false,
        riskState: 'high',
        dependencies: ['src/user.service.ts'],
        code: `import { User } from "./user.service";

// ⚠️ DEMO: This shows a hardcoded secret vulnerability example
// CodeMind AI detects patterns like this in your real code
const stripeSecretKey = "REDACTED_EXAMPLE_SECRET_KEY_DO_NOT_USE";

export async function processPayment(userId: string, amount: number) {
  console.log(\`Processing payment of $\${amount} for user \${userId}\`);
  // Charge user card using stripeSecretKey
  return { success: true, transactionId: "ch_mock_12983" };
}`,
        issues: [
          {
            id: 'issue-1-2-1',
            line: 4,
            type: 'Hardcoded Secret API Key',
            severity: 'high',
            explanation: 'A live Stripe API private token is checked into the source repository. This key can be compromised by third parties reading the codebase repository.',
            recommendedFix: `// Load stripe secret from secure environmental config
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;`,
            applied: false
          }
        ]
      },
      {
        id: 'file-1-3',
        projectId: 'proj-1',
        name: 'database.ts',
        path: 'src/database.ts',
        isDir: false,
        riskState: 'medium',
        dependencies: [],
        code: `// database.ts
export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {
    console.log("Connecting to database...");
  }

  // ARCHITECTURE VIOLATION: Singleton pattern is prohibited by team standards
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public query(sql: string, params?: any[] | Function, callback?: Function) {
    const cb = typeof params === 'function' ? params : callback;
    console.log(\`Executing query: \${sql}\`);
    if (cb) cb(null, { id: 1, username: "admin" });
  }
}

export const db = DatabaseConnection.getInstance();`,
        issues: [
          {
            id: 'issue-1-3-1',
            line: 9,
            type: 'Singleton Architectural Violation',
            severity: 'medium',
            explanation: 'The Singleton pattern static getInstance() is used, which makes unit testing harder and creates tightly coupled code dependency structures.',
            recommendedFix: `// Remove static getter and instantiate normally. Use Dependency Injection.
export class DatabaseConnection {
  constructor() { ... }
}
export const db = new DatabaseConnection();`,
            applied: false
          }
        ]
      },
      {
        id: 'file-1-4',
        projectId: 'proj-1',
        name: 'user.service.ts',
        path: 'src/user.service.ts',
        isDir: false,
        riskState: 'safe',
        dependencies: ['src/database.ts'],
        code: `import { db } from "./database";

export class UserService {
  async getUser(id: string) {
    return new Promise((resolve) => {
      db.query("SELECT * FROM users WHERE id = ?", [id], (err: any, user: any) => {
        resolve(user);
      });
    });
  }
}`,
        issues: []
      }
    ]
  },
  {
    id: 'proj-2',
    name: 'py-data-pipeline',
    description: 'Data analytics synchronization daemon written in Python.',
    language: 'Python',
    status: 'ready',
    overallScore: 68,
    securityScore: 54,
    architectureScore: 71,
    performanceScore: 75,
    maintainabilityScore: 72,
    branch: 'release-v1',
    commitHash: 'ac4e90d',
    files: [
      {
        id: 'file-2-1',
        projectId: 'proj-2',
        name: 'utils.py',
        path: 'utils.py',
        isDir: false,
        riskState: 'critical',
        dependencies: ['config.py'],
        code: `import os
import config

def run_backup(backup_path):
    print("Initiating backup task...")
    
    # CRITICAL: Command Injection vulnerability via raw shell command execution
    os.system("tar -czf backup.tar.gz " + backup_path)
    
    print("Backup completed successfully")`,
        issues: [
          {
            id: 'issue-2-1-1',
            line: 7,
            type: 'Command Injection',
            severity: 'critical',
            explanation: 'os.system directly appends raw string parameters and passes them to shell command context. If backup_path is controlled by user inputs, arbitrary code execution is possible.',
            recommendedFix: `import subprocess
# Run safely via structured array arguments without shell shell=True
subprocess.run(["tar", "-czf", "backup.tar.gz", backup_path], check=True)`,
            applied: false
          }
        ]
      },
      {
        id: 'file-2-2',
        projectId: 'proj-2',
        name: 'config.py',
        path: 'config.py',
        isDir: false,
        riskState: 'high',
        dependencies: [],
        code: `# Data Pipeline configurations
DB_HOST = "10.0.4.12"
DB_USER = "pipeline_runner"

# WARNING: Hardcoded password credentials
DB_PASS = "admin_super_secret_password_123!"`,
        issues: [
          {
            id: 'issue-2-2-1',
            line: 6,
            type: 'Hardcoded credentials',
            severity: 'high',
            explanation: 'The database user password credential value is exposed inside python configurations files.',
            recommendedFix: `import os
# Read passwords from secure environmental config parameters
DB_PASS = os.getenv("PIPELINE_DB_PASSWORD")`,
            applied: false
          }
        ]
      }
    ]
  }
];
