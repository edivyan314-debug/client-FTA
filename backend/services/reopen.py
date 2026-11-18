def should_reopen(yes: int, no: int, threshold: float = 0.25) -> bool:
    """
    Returns True if the rejection percentage exceeds the threshold
    AND total responses >= 3.
    """
    total = yes + no
    if total < 3:
        return False
    rejection_pct = no / total
    return rejection_pct > threshold
