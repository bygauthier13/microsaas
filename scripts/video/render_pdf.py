"""Renders the first three pages of <work>/evidence/evidence.pdf to PNG for the video."""
import sys
import pymupdf

work = sys.argv[1]
doc = pymupdf.open(f"{work}/evidence/evidence.pdf")
for i in range(min(3, doc.page_count)):
    doc[i].get_pixmap(dpi=110).save(f"{work}/evidence/evidence-p{i + 1}.png")
