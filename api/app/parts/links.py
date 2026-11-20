import logging
import re

logger = logging.getLogger(__name__)

PATH_RULE = re.compile(r"^(rods|reels|lines|leaders|tippets)/[a-z0-9-]+\.webp$")


def safe_purchase_url(url: str | None) -> str | None:
    """Return the URL only if it is https, so a bad link never reaches a page."""
    if url is None:
        return None
    if url.startswith("https://"):
        return url
    logger.warning("Dropping unsafe purchase_url %r", url)
    return None


def image_url_for(path: str | None) -> str | None:
    """Turn a stored image path into its public URL, or None if it is malformed."""
    if path is None:
        return None
    if PATH_RULE.fullmatch(path):
        return "/parts/" + path
    logger.warning("Dropping unsafe image_path %r", path)
    return None
