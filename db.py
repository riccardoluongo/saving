import sqlite3
import calendar
import re
import main
from sqlite3 import Error
from datetime import datetime
from currency_converter import CurrencyConverter, SINGLE_DAY_ECB_URL
from json import dumps, loads

converter = CurrencyConverter(SINGLE_DAY_ECB_URL)

CREATE_MAIN_TABLES_COMMAND = """
    CREATE TABLE IF NOT EXISTS main_transactions (
        id integer PRIMARY KEY,
        name text NOT NULL,
        date text NOT NULL,
        wallet text NOT NULL,
        price integer NOT NULL,
        balance_snapshot text NOT NULL,
        currency text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS main_balance (
        id integer PRIMARY KEY,
        value integer NOT NULL,
        currency text NOT NULL
    ); """

def is_table_name_valid(table):
    pattern = r'^[a-zA-Z_][a-zA-Z0-9_]*$'
    forbidden = ["balance", "transactions"]
    return bool(re.fullmatch(pattern, table) and not any(word in table.lower() for word in forbidden))

def initialize_db(user):
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
            cur.executescript(CREATE_MAIN_TABLES_COMMAND)
            create_initial_rows(user)
    except Error as e:
        main.app.logger.error(f"Error while initializing the main tables for user '{user}': {e}")

    #create main tables if deleted signal = 0
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM deleted_tables_check WHERE id = 1")
        value = cur.fetchall()[0][1]

        if value == 0:
            cur.executescript(CREATE_MAIN_TABLES_COMMAND)
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
            cur.execute("INSERT INTO main_balance(value, currency) VALUES(0, 'USD')")
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

    if is_table_name_valid(wallet):
        id = 1
        cur.execute(f"UPDATE [{wallet}_balance] SET value = ? WHERE id = ?", (value, id),)
        conn.commit()
    else:
        main.app.logger.error(f"Error while updating the balance for wallet '{wallet}' of user '{user}': invalid table name")
    conn.close()

def get_balance(wallet, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if is_table_name_valid(wallet):
            cur.execute(f"SELECT value, currency FROM [{wallet}_balance] WHERE id = 1")
            balance = cur.fetchall()[0]
            return balance
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while retrieving balance from wallet '{wallet}' for user '{user}': {e}")

def create_wallet(name, start_balance, currency, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if is_table_name_valid(name):
            cur.executescript(f"""
            CREATE TABLE IF NOT EXISTS [{name}_transactions] (
                id integer PRIMARY KEY,
                name text NOT NULL,
                date text NOT NULL,
                wallet text NOT NULL,
                price integer NOT NULL,
                balance_snapshot text NOT NULL,
                currency text NOT NULL
            );
            CREATE TABLE IF NOT EXISTS [{name}_balance] (
                id integer PRIMARY KEY,
                value integer NOT NULL,
                currency text NOT NULL
            );
            """)
            cur.execute(f"INSERT INTO [{name}_balance](value, currency) VALUES(?, ?)", (start_balance, currency))

            conn.commit()
            main.app.logger.info(f"Created wallet '{name}' for user '{user}' with starting balance: {start_balance/100} {currency}")
            return 0
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while creating wallet '{name}' for user '{user}': {e}")
        return 1
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

        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?;", (f'%balance%',))
        tables = cur.fetchall()
        conn.commit()

        wallets = []
        for table in tables:
            wallets.append(get_wallet_name(table[0]))

        return wallets
    except Error as e:
        main.app.logger.error(f"Error while retrieving wallets for user '{user}': {e}")
    finally:
        conn.close()

def delete_wallet(name, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if is_table_name_valid(name):
            cur.execute(f"DROP TABLE IF EXISTS [{name}_balance]")
            cur.execute(f"DROP TABLE IF EXISTS [{name}_transactions]")
            if name == 'main':
                cur.execute("UPDATE deleted_tables_check SET value = 1 WHERE ID = 1")

            conn.commit()
            main.app.logger.info(f"Deleted wallet '{name}' for user '{user}'")
            return 0
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while deleting wallet '{name}' for user '{user}': {e}")
        return 1
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

        cur.executescript(CREATE_MAIN_TABLES_COMMAND)
        create_initial_rows(user)
        main.app.logger.info(f"Deleted all wallets for user '{user}'")
        return 0
    except Error as e:
        main.app.logger.error(f"Error while deleting all wallets for user '{user}': {e}")
        return 1
    finally:
        conn.close()

def add_transaction(name, wallet, value, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    old_balance = get_balance(wallet,user)
    balance = old_balance[0] + value
    update_balance(wallet, balance, user)

    try:
        if is_table_name_valid(wallet):
            sql = f"INSERT INTO [{wallet}_transactions](name, date, wallet, price, balance_snapshot, currency) VALUES(?, datetime('now'), ?, ?, ?, ?)"

            cur.execute(sql, (name, wallet, value, dumps(get_wallet_balance_list(user)), old_balance[1]))
            conn.commit()
            main.app.logger.info(f"User '{user}' added {value/100}$ to wallet '{wallet}'")
            return 0
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while processing '{name}' transaction for user '{user}': {e}")
        return 1
    finally:
        conn.close()

def pay_transaction(name, wallet, value, user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    old_balance = get_balance(wallet,user)
    balance = old_balance[0] - value
    update_balance(wallet, balance, user)

    try:
        if is_table_name_valid(wallet):
            sql = f"INSERT INTO [{wallet}_transactions](name, date, wallet, price, balance_snapshot, currency) VALUES(?, datetime('now'), ?, ?, ?, ?)"

            cur.execute(sql, (name, wallet, -value, dumps(get_wallet_balance_list(user)), old_balance[1]))
            conn.commit()
            main.app.logger.info(f"User '{user}' took {value/100}$ off wallet '{wallet}'")
            return 0
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while processing '{name}' transaction for user '{user}': {e}")
        return 1
    finally:
        conn.close()

def get_transactions(wallet, user, offset, limit):
    database_file = r"./database/"+user+".db"
    offset = int(offset)
    limit = int(limit)

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if is_table_name_valid(wallet):
            cur.execute(f"SELECT name,DATE(date),price,wallet,id,currency FROM [{wallet}_transactions]")
            transactions = cur.fetchall()

            if limit == 0:
                return transactions
            else:
                transactions.reverse()
                paginated_transactions = []
                for i in range(offset, min(offset+limit, len(transactions))):
                    paginated_transactions.append(transactions[i])

                return paginated_transactions
        else:
            raise Error("invalid table name")
    except Error as e:
        main.app.logger.error(f"Error while retrieving transactions from wallet '{wallet}' for user '{user}': {e}")
    finally:
        conn.close()

def delete_transaction(wallet,id,user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        if is_table_name_valid(wallet):
            cur.execute(f"SELECT price FROM [{wallet}_transactions] WHERE id = ?", (id,))
            trans_price = cur.fetchall()[0][0]

            current_balance = get_balance(wallet, user)[0]
            update_balance(wallet, current_balance-trans_price, user)

            cur.execute(f"DELETE FROM [{wallet}_transactions] WHERE id = ?", (id,))
            conn.commit()
        else:
            raise Error("invalid table name")
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
            query = f"SELECT price, balance_snapshot, date, id, name, wallet, currency FROM [{table_name}];"
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

            transaction = row[0]
            balance_snapshot = row[1]
            id = row[3]
            name = row[4]
            wallet = row[5]
            currency = row[6]

            monthly_data[year_key][month_key][day_key].append([date_obj, transaction, balance_snapshot, id, name, wallet, currency])
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
                        last_updated_day_data = (monthly_data[year_key][month_key][day][-1][2], monthly_data[year_key][month_key][day][-1][6])
                    elif last_updated_day_data:
                        monthly_data[year_key][month_key][day] = [[0,0,last_updated_day_data[0],0,0,0,last_updated_day_data[1]]]
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

def get_wallet_balance_list(user):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?;", (f'%balance%',))
        tables = cur.fetchall()

        balance_list = []

        for table in tables:
            table_name = table[0]
            cur.execute(f"SELECT value, currency FROM {table_name};")
            balance_list.append(cur.fetchall()[0])

        return balance_list
    except Error as e:
        main.app.logger.error(f"Error while retrieving list of wallets' balance for user '{user}': {e}")
    finally:
        conn.close()

def get_total_balance(user, currency):
    database_file = r"./database/"+user+".db"

    try:
        conn = sqlite3.connect(database_file, check_same_thread=False)
        cur = conn.cursor()
    except Error as e:
        main.app.logger.error(f"Error while connecting user '{user}' to the database: {e}")

    try:
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?;", (f'%balance%',))
        tables = cur.fetchall()

        balance_list = []

        for table in tables:
            table_name = table[0]
            cur.execute(f"SELECT value, currency FROM {table_name};")
            wallet_balance, wallet_currency = cur.fetchall()[0]
            balance_list.append(converter.convert(wallet_balance, wallet_currency, currency))

        return sum(balance_list)
    except Error as e:
        main.app.logger.error(f"Error while retrieving total balance for user '{user}': {e}")
    finally:
        conn.close()

def get_monthly_difference(user, year, selected_currency, transactions):
    try:
        months = []
        year = year

        for month in transactions[year]:
            monthly_transactions = []
            for day in transactions[year][month]:
                for transaction in transactions[year][month][day]:
                    if transaction[1] != 0:
                        if transaction[6] == selected_currency:
                            monthly_transactions.append(transaction[1])
                        else:
                            monthly_transactions.append(converter.convert(transaction[1], transaction[6], selected_currency))

            months.append(sum(monthly_transactions))

        return months
    except Error as e:
        main.app.logger.error(f"Error while calculating monthly balance difference for user '{user}': {e}")

def calculate_graph_data(user, year, month, selected_currency):
    try:
        year = int(year)
        month = calendar.month_name[int(month)]
        transactions = get_all_transactions(user)
        monthly_difference = get_monthly_difference(user, year, selected_currency, transactions)
        graph_data = []

        for day in transactions[year][month]:
            snapshot = loads(transactions[year][month][day][-1][2])

            for wallet in snapshot:
                if wallet[1] == selected_currency:
                    graph_data.append([day, wallet[0]/100])
                else:
                    if wallet[0] != 0:
                        graph_data.append([day, converter.convert(wallet[0], wallet[1], selected_currency)/100])
                    else:
                        graph_data.append([day, 0])
        graph_data.sort(key=lambda x: x[0])

        if month == list(transactions[year].keys())[-1] and year == list(transactions.keys())[-1]:
            graph_data[-1][1] = get_total_balance(user, selected_currency)/100

        return (graph_data, monthly_difference)
    except Error as e:
        main.app.logger.error(f"Couldn't calculate graph data for user {user}: {e}")
#Riccardo Luongo, 01/06/2025