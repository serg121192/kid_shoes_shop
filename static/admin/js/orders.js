'use strict';
(function () {
  function applyOrderRowColors() {
    document.querySelectorAll('#result_list tbody tr').forEach(function (row) {
      var badge = row.querySelector('[data-status]');
      if (!badge) return;
      var status = badge.getAttribute('data-status');
      if (status) row.classList.add('order-' + status);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyOrderRowColors);
  } else {
    applyOrderRowColors();
  }
})();
