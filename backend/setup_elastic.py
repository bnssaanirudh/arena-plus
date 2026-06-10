import asyncio
from app.elastic.indexes import setup_indexes
from app.elastic.ingestion import run_initial_ingestion

async def main():
    print("Setting up indexes...")
    await setup_indexes()
    print("Running initial ingestion...")
    await run_initial_ingestion()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
