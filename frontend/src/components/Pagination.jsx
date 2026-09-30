import React from 'react';

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const renderPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <span key={i} className={`page-num ${currentPage === i ? 'active' : ''}`} onClick={() => onPageChange(i)}>{i}</span>
        );
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(<span key={i} className={`page-num ${currentPage === i ? 'active' : ''}`} onClick={() => onPageChange(i)}>{i}</span>);
        }
        pages.push(<span key="ellipsis" className="page-num" style={{pointerEvents: 'none'}}>...</span>);
        pages.push(<span key={totalPages} className={`page-num ${currentPage === totalPages ? 'active' : ''}`} onClick={() => onPageChange(totalPages)}>{totalPages}</span>);
      } else if (currentPage >= totalPages - 2) {
        pages.push(<span key={1} className={`page-num ${currentPage === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>1</span>);
        pages.push(<span key="ellipsis" className="page-num" style={{pointerEvents: 'none'}}>...</span>);
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(<span key={i} className={`page-num ${currentPage === i ? 'active' : ''}`} onClick={() => onPageChange(i)}>{i}</span>);
        }
      } else {
        pages.push(<span key={1} className={`page-num ${currentPage === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>1</span>);
        pages.push(<span key="ellipsis1" className="page-num" style={{pointerEvents: 'none'}}>...</span>);
        pages.push(<span key={currentPage - 1} className="page-num" onClick={() => onPageChange(currentPage - 1)}>{currentPage - 1}</span>);
        pages.push(<span key={currentPage} className="page-num active" onClick={() => onPageChange(currentPage)}>{currentPage}</span>);
        pages.push(<span key={currentPage + 1} className="page-num" onClick={() => onPageChange(currentPage + 1)}>{currentPage + 1}</span>);
        pages.push(<span key="ellipsis2" className="page-num" style={{pointerEvents: 'none'}}>...</span>);
        pages.push(<span key={totalPages} className={`page-num ${currentPage === totalPages ? 'active' : ''}`} onClick={() => onPageChange(totalPages)}>{totalPages}</span>);
      }
    }
    return pages;
  };

  return (
    <div className="pagination">
      <span className="page-num" style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }} onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}>&lt;</span>
      {renderPages()}
      <span className="page-num" style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }} onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}>&gt;</span>
    </div>
  );
}
