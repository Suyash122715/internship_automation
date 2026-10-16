import os
import logging
from typing import Optional
import pypdf
import docx

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT file strictly without modifying content."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    _, ext = os.path.splitext(file_path.lower())
    text_content = ""

    if ext == ".pdf":
        text_content = _extract_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        text_content = _extract_from_docx(file_path)
    elif ext in [".txt", ".md"]:
        text_content = _extract_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: .pdf, .docx, .txt")

    return text_content.strip()


def _extract_from_pdf(file_path: str) -> str:
    text_chunks = []
    try:
        reader = pypdf.PdfReader(file_path)
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(page_text)
    except Exception as e:
        logger.warning(f"pypdf extraction failed, attempting pdfplumber fallback: {e}")
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    txt = page.extract_text()
                    if txt:
                        text_chunks.append(txt)
        except Exception as inner_e:
            logger.error(f"Both PDF extractors failed: {inner_e}")
            raise RuntimeError(f"Could not parse PDF content: {inner_e}")

    return "\n\n".join(text_chunks)


def _extract_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        
        # Also extract table text if present
        for table in doc.tables:
            for row in table.rows:
                row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_texts:
                    paragraphs.append(" | ".join(row_texts))
                    
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        raise RuntimeError(f"Could not parse DOCX content: {e}")


def _extract_from_txt(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as e:
        logger.error(f"TXT extraction failed: {e}")
        raise RuntimeError(f"Could not parse TXT content: {e}")
