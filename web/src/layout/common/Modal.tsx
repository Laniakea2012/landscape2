import { MouseEvent, useEffect, useRef, useState } from 'react';

import { useBodyScroll } from '../../hooks/useBodyScroll';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  header: string | JSX.Element;
  headerClassName?: string;
  children: JSX.Element;
  onClose: () => void;
  size?: string;
  visibleContentBackdrop?: boolean;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(props.open);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick([ref], openStatus, () => {
    closeModal();
  });
  useBodyScroll(openStatus, 'modal');

  const closeModal = () => {
    props.onClose();
    setOpenStatus(false);
  };

  useEffect(() => {
    setOpenStatus(props.open);
  }, [props.open]);

  if (!props.open) return null;

  return (
    <>
      <div className={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />

      <div className={`modal d-block ${styles.modal} ${styles.active}`} role="dialog" aria-modal={true}>
        <div
          className={`modal-dialog modal-${props.size || 'lg'} modal-dialog-centered modal-dialog-scrollable`}
          ref={ref}
        >
          <div className={`modal-content rounded-0 border border-3 mx-auto position-relative ${styles.content}`}>
            <div className={`modal-header rounded-0 d-flex flex-row align-items-center ${styles.header}`}>
              <div className={`modal-title h5 m-2 flex-grow-1 ${styles.headerContent}`}>{props.header}</div>

              <button
                type="button"
                className="btn-close"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  closeModal();
                }}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body p-4 h-100 d-flex flex-column">{props.children}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;