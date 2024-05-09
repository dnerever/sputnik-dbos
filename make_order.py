# usage: 
# python3 make_order.py --price=1 --size=2 --side=sell --trader=3

import requests
import argparse

parser = argparse.ArgumentParser(description='Send order data to the server.')
parser.add_argument('--price', type=int, help='Price of the order', default=1)
parser.add_argument('--size', type=float, help='Size of the order', default=1)
parser.add_argument('--side', type=str, help='Side of the order', default='buy')
parser.add_argument('--trader', type=int, help='Trader ID', default=1)
args = parser.parse_args()

if args.size <= 0: 
    print("Size must be greater than 0")
    exit(1)
if args.price <= 0: 
    print("Price must be greater than 0")
    exit(1)
if args.trader <= 0: 
    print("Trader must be greater than 0")
    exit(1)
if args.side != 'buy' and args.side != 'sell':
    print("Side must be either 'buy' or 'sell'")
    exit(1)

# url = "http://localhost:3000/order"
url = "https://dnerever-sputnik-dbos.cloud.dbos.dev/order"

# Define the JSON data structure to send
data = {
    "order": {
        "price": args.price,
        "size": args.size,
        "side": args.side,
        "trader": args.trader
    }
}

# Define headers, including Content-Type and potentially an Authorization token
headers = {
    "Content-Type": "application/json",
}

# Send a POST request with the JSON data and headers
response = requests.post(url, json=data, headers=headers)

# Print the status code and response data
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")