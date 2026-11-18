import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from services.reopen import should_reopen


def test_no_reopen_below_threshold():
    """yes=3, no=1 -> 1/4 = 25% -> NOT > 25% -> no reopen."""
    assert should_reopen(yes=3, no=1) == False


def test_reopen_above_threshold():
    """yes=3, no=2 -> 2/5 = 40% -> reopen."""
    assert should_reopen(yes=3, no=2) == True


def test_majority_yes():
    """yes=8, no=2 -> 2/10 = 20% -> no reopen."""
    assert should_reopen(yes=8, no=2) == False


def test_minimum_responses():
    """Less than 3 total responses -> no reopen regardless of ratio."""
    assert should_reopen(yes=0, no=2) == False
    assert should_reopen(yes=1, no=1) == False
    assert should_reopen(yes=0, no=1) == False


def test_exact_threshold():
    """yes=3, no=1 -> exactly 25% -> NOT strictly > 25% -> no reopen."""
    assert should_reopen(yes=3, no=1, threshold=0.25) == False


def test_high_rejection():
    """yes=1, no=3 -> 75% -> reopen (well above 25% threshold)."""
    assert should_reopen(yes=1, no=3) == True
