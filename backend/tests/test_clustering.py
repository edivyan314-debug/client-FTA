import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pytest
from services.clustering import cosine_similarity


def test_identical_vectors():
    """Identical vectors should have cosine similarity of 1.0."""
    v = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    sim = cosine_similarity(v, v)
    assert abs(sim - 1.0) < 1e-6


def test_orthogonal_vectors():
    """Orthogonal vectors should have cosine similarity of 0.0."""
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    sim = cosine_similarity(a, b)
    assert abs(sim - 0.0) < 1e-6


def test_above_threshold():
    """Vectors with high cosine sim >= 0.78 should cluster together."""
    a = np.array([1.0, 1.0, 0.0], dtype=np.float32)
    # Slightly perturbed version - should have high similarity
    b = np.array([1.0, 0.95, 0.05], dtype=np.float32)
    sim = cosine_similarity(a, b)
    assert sim >= 0.78, f"Expected sim >= 0.78, got {sim}"


def test_below_threshold():
    """Vectors with low cosine sim < 0.78 should NOT cluster."""
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([0.0, 1.0, 0.5], dtype=np.float32)
    sim = cosine_similarity(a, b)
    assert sim < 0.78, f"Expected sim < 0.78, got {sim}"


def test_zero_vector():
    """Zero vector should return 0.0 without crashing."""
    zero = np.zeros(3, dtype=np.float32)
    v = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    sim = cosine_similarity(zero, v)
    assert sim == 0.0
    sim2 = cosine_similarity(v, zero)
    assert sim2 == 0.0
    sim3 = cosine_similarity(zero, zero)
    assert sim3 == 0.0
