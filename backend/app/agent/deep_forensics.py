from app.services.ai_engine import ai_engine

def run_deep_forensics_scan(market_data: dict) -> dict:
    """
    Executes a deep forensic scan using the NVIDIA NIM AI Engine to determine
    optimal entry, exit (SL/TP with 1:2 RRR), and timeframe.
    """
    analysis = ai_engine.process_market_data(market_data)
    return analysis
