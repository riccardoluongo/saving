import sqlite3
import calendar
import re
import main
from sqlite3 import Error
from datetime import datetime

def initialize_db(user):
    global create_main_tables_command

    """
    connect to the database,
    create the table if it does not exist
    """
    database_file = r"./database/"+user+".db"
    create_signal_table_command =  """
    CREATE TABLE IF NOT EXISTS deleted_tables_check (
        id integer PRIMARY KEY,
        value integer NOT NULL
    ) """
    create_main_tables_command = """
    CREATE TABLE IF NOT EXISTS main_transactions (
        id integer PRIMARY KEY,
        name text NOT NULL,
        date text NOT NULL,
        wallet text NOT NULL,
        price text NOT NULL,
        balance_snapshot text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS main_balance (
        id integer PRIMARY KEY,
        value text NOT NULL
    ); """

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
        main.app.logger.info(f"User '{user}' successfully connected to the database")
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    #create the delete signal table if it does not exist
    try:
        cur.execute(create_signal_table_command)
        conn.commit()

        cur.execute("SELECT rowid FROM deleted_tables_check WHERE id = 1")
        data=cur.fetchall()
        if len(data)==0:
            cur.execute("INSERT INTO deleted_tables_check(value) VALUES(0)")
            conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while initializing the delete signal table for user '{user}': {e}")

    #create main tables if no table found
    try:
        cur = conn.cursor()
        if len(get_wallets(user)) == 0:
            cur.executescript(create_main_tables_command)
            create_initial_rows(user)
    except Error as e:
        main.app.logger.error(f"Error while initializing the main tables for user '{user}': {e}")

    #create main tables if deleted signal = 0
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM deleted_tables_check WHERE id = 1")
        value = cur.fetchall()[0][1]

        if value == 0:
            cur.executescript(create_main_tables_command)
            create_initial_rows(user)
        elif value == 1:
            pass
        else:
            main.app.logger.warning(f"Invalid value found in deleted_tables_check row for user '{user}'. Restoring...")
            cur.execute("INSERT INTO deleted_tables_check(value) VALUES(0)")
            conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while initializing the main tables for user '{user}': {e}")

    conn.close()

def get_wallet_name(input_string):
    result = ""
    index = 0
    word = 'balance'

    word_length = len(word)

    while index < len(input_string):
        if input_string[index:index + word_length] == word:
            if index > 0:
                result = result[:-1]
            index += word_length
        else:
            result += input_string[index]
            index += 1
            
    return result

def create_initial_rows(user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        cur.execute("SELECT rowid FROM main_balance WHERE id = 1")
        data=cur.fetchall()
        if len(data)==0:
            cur.execute("INSERT INTO main_balance(value) VALUES('0$')")
            conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while initializing balance row for user '{user}': {e}")
    finally:
        conn.close()

def update_balance(wallet, value, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    if not re.match(r'^[A-Za-z0-9_]+$', wallet):
        main.app.logger.error(f"Error while updating the balance for wallet '{wallet}' of user '{user}': invalid table name")
        conn.close()
        return
    id = 1
    sql = f''' UPDATE [{wallet}_balance]
              SET value = ?
              WHERE id = ?'''
    cur.execute(sql, (value, id),)
    conn.commit()
    conn.close()

def get_balance(wallet, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if not re.match(r'^[A-Za-z0-9_]+$', wallet):
            raise Error("Invalid table name")
        cur.execute(f"SELECT * FROM [{wallet}_balance] WHERE id = 1")
        balance = cur.fetchall()[0][1]
        return balance
    except Error as e:
        main.app.logger.error(f"Error while retrieving balance from wallet '{wallet}' for user '{user}': {e}")
    finally:
        conn.close()

def create_wallet(name, start_balance, user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        if not re.match(r'^[A-Za-z0-9_]+$', name):
            raise Error("Invalid table name")

        cur.executescript(f"""
        CREATE TABLE IF NOT EXISTS [{name}_transactions] (
            id integer PRIMARY KEY,
            name text NOT NULL,
            date text NOT NULL,
            wallet text NOT NULL,
            price text NOT NULL,
            balance_snapshot text NOT NULL
        );
        CREATE TABLE IF NOT EXISTS [{name}_balance] (
        id integer PRIMARY KEY,
        value text NOT NULL
        );
        """)
        sql = f"INSERT INTO [{name}_balance](value) VALUES(?)"
        cur.execute(sql, (start_balance+"$",))

        conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while creating wallet '{name}' for user '{user}': {e}")
    finally:
        conn.close()

def get_wallets(user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user} 'to the database: {e}")

        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cur.fetchall()
        conn.commit()

        wallets = []
        for table in tables:
            if 'balance' in table[0]:
                wallets.append(get_wallet_name(table[0]))

        return wallets
    except Error as e:
        main.app.logger.error(f"Error while retrieving wallets for user '{user}': {e}")
    finally:
        conn.close()

def delete_wallet(name, user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        if not re.match(r'^[A-Za-z0-9_]+$', name):
            raise Error("Invalid table name")

        cur.execute(f"DROP TABLE IF EXISTS [{name}_balance]")
        cur.execute(f"DROP TABLE IF EXISTS [{name}_transactions]")
        if name == 'main':
            cur.execute("UPDATE deleted_tables_check SET value = 1 WHERE ID = 1")
        conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while deleting wallet '{name}' for user '{user}': {e}")
    finally:
        conn.close()

def delete_all(user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        for wallet in get_wallets(user):
            delete_wallet(wallet,user)

        if len(get_wallets(user)) == 0:
            cur.executescript(create_main_tables_command)
            create_initial_rows(user)
    except Error as e:
        main.app.logger.error(f"Error while deleting all wallets for user '{user}': {e}")
    finally:
        conn.close()

def add_transaction(name, wallet, value, user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        balance = round(float(get_balance(wallet,user)[:-1]), 2)
        value = round(float(value), 2)
        update_balance(wallet, f"{round(balance + value, 2)}$", user)

        if not re.match(r'^[A-Za-z0-9_]+$', wallet):
            raise Error("Invalid table name")

        formatted_value = f"+{value}$"
        sql = f"INSERT INTO [{wallet}_transactions](name, date, wallet, price, balance_snapshot) VALUES(?, datetime('now'), ?, ?, ?)"

        cur.execute(sql, (name, wallet, formatted_value, get_total_balance(user)))
        conn.commit()
        return 0
    except Error as e:
        main.app.logger.error(f"Error while processing '{name}' transaction for user '{user}': {e}")
        return 1
    finally:
        conn.close()

def pay_transaction(name, wallet, value, user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        balance = round(float(get_balance(wallet, user)[:-1]), 2)
        value = round(float(value), 2)
        update_balance(wallet, f"{round(balance - value, 2)}$", user)

        if not re.match(r'^[A-Za-z0-9_]+$', wallet):
            raise Error("Invalid table name")

        formatted_value = f"-{value}$"
        sql = f"INSERT INTO [{wallet}_transactions](name, date, wallet, price, balance_snapshot) VALUES(?, datetime('now'), ?, ?, ?)"

        cur.execute(sql, (name, wallet, formatted_value, get_total_balance(user)))
        conn.commit()
        return 0
    except Error as e:
        main.app.logger.error(f"Error while processing '{name}' transaction for user '{user}': {e}")
        return 1
    finally:
        conn.close()

def get_transactions(wallet, user, offset, limit):
    try:
        database_file = r"./database/"+user+".db"
        paginated_transactions = []
        offset = int(offset)
        limit = int(limit)

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        if not re.match(r'^[A-Za-z0-9_]+$', wallet):
            raise Error("Invalid table name")

        cur.execute(f"SELECT name,DATE(date),price,wallet,id FROM [{wallet}_transactions]")
        transactions = cur.fetchall()
        transactions.reverse()

        if limit == 0:
            return transactions
        else:
            for i in range(offset, min(offset+limit, len(transactions))):
                paginated_transactions.append(transactions[i])

        return paginated_transactions
    except Error as e:
        main.app.logger.error(f"Error while retrieving transactions from wallet '{wallet}' for user '{user}': {e}")
    finally:
        conn.commit()

def delete_transaction(wallet,id,user):
    try:
        database_file = r"./database/"+user+".db"

        try:
            conn = sqlite3.connect(database_file, check_same_thread=False)
            cur = conn.cursor()
        except Error as e:
            main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

        if not re.match(r'^[A-Za-z0-9_]+$', wallet):
            raise Error("Invalid table name")

        cur.execute(f"SELECT price FROM [{wallet}_transactions] WHERE id = ?", (id,))
        trans_price = cur.fetchall()[0][0]
        trans_price = float(trans_price[:-1])

        current_balance = round(float(get_balance(wallet, user)[:-1]), 2)
        update_balance(wallet, f"{round(current_balance-trans_price, 2)}$", user)

        cur.execute(f"DELETE FROM [{wallet}_transactions] WHERE id = ?", (id,))
        conn.commit()
    except Error as e:
        main.app.logger.error(f"Error while deleting transaction #{id} from wallet '{wallet}' for user '{user}': {e}")
    finally:
        conn.close()

def get_all_transactions(user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?;", (f'%transactions%',))
        tables = cur.fetchall()

        combined_results = []

        for table in tables:
            table_name = table[0]
            query = f"SELECT price, balance_snapshot, date, id, name, wallet FROM [{table_name}];"
            cur.execute(query)
            results = cur.fetchall()
            combined_results.extend(results)

        monthly_data = {}
        today = datetime.now().date()

        for row in combined_results:
            date_str = row[2]
            date_obj = datetime.strptime(date_str, f'%Y-%m-%d %H:%M:%S')
            year_key = date_obj.year
            month_key = date_obj.strftime('%B')
            day_key = date_obj.day
            
            if year_key not in monthly_data:
                monthly_data[year_key] = {}
            if month_key not in monthly_data[year_key]:
                monthly_data[year_key][month_key] = {}
            if day_key not in monthly_data[year_key][month_key]:
                monthly_data[year_key][month_key][day_key] = []
            
            formatted_trans = float(row[0][:-1])
            balance_snapshot = float(row[1])
            id = row[3]
            name = row[4]
            wallet = row[5]

            monthly_data[year_key][month_key][day_key].append([date_obj, formatted_trans, balance_snapshot, id, name, wallet])
            monthly_data[year_key][month_key][day_key].sort(key=lambda x: x[0])

        for year_key in monthly_data:
            for month_key in monthly_data[year_key]:
                month_num = datetime.strptime(month_key, '%B').month
                _, num_days = calendar.monthrange(year_key, month_num)

                last_updated_day_data = None 
                for day in range(1, num_days + 1):
                    if datetime(year_key, month_num, day).date() > today:
                        break
                    if day in monthly_data[year_key][month_key]:
                        last_updated_day_data = monthly_data[year_key][month_key][day][-1][2]
                    elif last_updated_day_data:
                        monthly_data[year_key][month_key][day] = [[0,0,last_updated_day_data]]
        return monthly_data
    except Error as e:
        main.app.logger.error(f"Error while retrieving all transactions for user '{user}': {e}")
    finally:
        conn.commit()
        conn.close()

def get_transactions_list(user, offset, limit):
    offset = int(offset)
    limit = int(limit)
    all_transactions = get_all_transactions(user)
    transactions_list = []
    paginated_transactions = []

    for year in all_transactions:
        for month in all_transactions[year]:
            for day in all_transactions[year][month]:
                for i, transaction in enumerate(all_transactions[year][month][day]):
                    if all_transactions[year][month][day][i][1] != 0:
                        transactions_list.append(all_transactions[year][month][day][i])
    transactions_list.reverse()

    if limit == 0:
        return transactions_list
    else:
        for i in range(offset, min(offset+limit, len(transactions_list))):
            paginated_transactions.append(transactions_list[i])

    return paginated_transactions

def get_total_balance(user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?;", (f'%balance%',))
        tables = cur.fetchall()

        combined_results = []

        for table in tables:
            table_name = table[0]
            query = f"SELECT value FROM {table_name};"
            cur.execute(query)
            results = cur.fetchall()[0]
            combined_results.append(float(results[0][:-1]))

        return round(sum(combined_results),2)
    except Error as e:
        main.app.logger.error(f"Error while retrieving total balance for user '{user}': {e}")
    finally:
        conn.close()
#By Riccardo Luongo, 10/03/2024