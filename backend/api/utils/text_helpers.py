from typing import Dict


def wrap_long_words_all_columns(record: Dict, fields_to_wrap: Dict[str, int]) -> Dict:
    """
    Wraps long single words (length > chunk) for specified fields.

    Arguments:
    - record: Dict representing a single record.
    - fields_to_wrap: Dict with field names as keys and chunk size as values.

    Returns a new dict with updated values.
    """

    def wrap_word(word: str, chunk: int) -> str:
        if not word or not isinstance(word, str):
            return word
        parts = []
        for w in word.split():
            if len(w) > chunk and " " not in w:
                w = "<br/>".join([w[i : i + chunk] for i in range(0, len(w), chunk)])
            parts.append(w)
        return " ".join(parts)

    wrapped_record = {}
    for key, value in record.items():
        if key in fields_to_wrap:
            wrapped_record[key] = wrap_word(value, fields_to_wrap[key])
        else:
            wrapped_record[key] = value

    return wrapped_record
