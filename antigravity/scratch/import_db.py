import pymysql
import re

# Database connection details
DB_HOST = "bbi1kz6pfaeeefphm41o-mysql.services.clever-cloud.com"
DB_NAME = "bbi1kz6pfaeeefphm41o"
DB_USER = "uyzfznmybrxj60au"
DB_PASS = "OWG0GNeka3NAxouT4V6f"
DB_PORT = 3306

def parse_sql_statements(content):
    statements = []
    current_stmt = []
    
    state = "NORMAL" # NORMAL, STR_SINGLE, STR_DOUBLE, COMMENT_DASH, COMMENT_HASH, COMMENT_MULTI
    
    i = 0
    n = len(content)
    while i < n:
        char = content[i]
        
        if state == "NORMAL":
            if char == "'":
                state = "STR_SINGLE"
                current_stmt.append(char)
            elif char == '"':
                state = "STR_DOUBLE"
                current_stmt.append(char)
            elif char == '/' and i + 1 < n and content[i+1] == '*':
                state = "COMMENT_MULTI"
                i += 1 # skip '*'
            elif char == '-' and i + 1 < n and content[i+1] == '-':
                # Double dash must be followed by space or control char to be a comment in standard SQL,
                # but we'll accept any double dash as comment start.
                state = "COMMENT_DASH"
                i += 1
            elif char == '#':
                state = "COMMENT_HASH"
            elif char == ';':
                statements.append("".join(current_stmt).strip())
                current_stmt = []
            else:
                current_stmt.append(char)
                
        elif state == "STR_SINGLE":
            if char == '\\' and i + 1 < n:
                current_stmt.append(char)
                current_stmt.append(content[i+1])
                i += 1
            elif char == "'":
                state = "NORMAL"
                current_stmt.append(char)
            else:
                current_stmt.append(char)
                
        elif state == "STR_DOUBLE":
            if char == '\\' and i + 1 < n:
                current_stmt.append(char)
                current_stmt.append(content[i+1])
                i += 1
            elif char == '"':
                state = "NORMAL"
                current_stmt.append(char)
            else:
                current_stmt.append(char)
                
        elif state == "COMMENT_MULTI":
            if char == '*' and i + 1 < n and content[i+1] == '/':
                state = "NORMAL"
                i += 1
                
        elif state in ("COMMENT_DASH", "COMMENT_HASH"):
            if char in ('\n', '\r'):
                state = "NORMAL"
                current_stmt.append(char)
                
        i += 1
        
    if current_stmt:
        last_stmt = "".join(current_stmt).strip()
        if last_stmt:
            statements.append(last_stmt)
            
    return statements

def execute_sql_file(cursor, filepath):
    print(f"Reading file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    statements = parse_sql_statements(content)
    
    count = 0
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
            
        # Ignore CREATE DATABASE and USE statements
        if re.match(r'^(CREATE DATABASE|USE)\b', stmt, re.IGNORECASE):
            print(f"Skipping statement: {stmt[:50]}...")
            continue
            
        try:
            cursor.execute(stmt)
            count += 1
        except Exception as e:
            print(f"Error executing statement:\n{stmt}\nError: {e}")
            raise e
            
    print(f"Successfully executed {count} statements from {filepath}")

def main():
    print("Connecting to Clever Cloud MySQL...")
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        with connection.cursor() as cursor:
            # Disable foreign key checks to import successfully
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            # Import schema
            execute_sql_file(cursor, r"C:\Users\HP\Desktop\classconnecto\db\schema.sql")
            
            # Import seed data
            execute_sql_file(cursor, r"C:\Users\HP\Desktop\classconnecto\db\seed.sql")
            
            # Re-enable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
        connection.commit()
        print("Database import completed successfully!")
        
    except Exception as e:
        connection.rollback()
        print(f"Database import failed: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    main()
