//////////////////////////////////////////////////////////////////////////////////////////
//   _  _ ____ _  _ ___  ____                                                           //
//   |_/  |__| |\ | |  \ |  |    This file belongs to Kando, the cross-platform         //
//   | \_ |  | | \| |__/ |__|    pie menu. Read more on github.com/menu/kando           //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
// SPDX-License-Identifier: MIT

import Handlebars from 'handlebars';
import { EventEmitter } from 'events';

import * as math from '../../math';
import { IEditorNode } from '../editor-node';

/**
 * This class is responsible for displaying the menu preview of the editor. It supports
 * navigation through the menu hierarchy by clicking on the menu items in the preview. It
 * also supports the reordering of the menu items by drag'n'drop.
 *
 * It will emit the following events:
 *
 * - 'select': This is emitted when a menu item is selected. The event data is the selected
 *   menu item.
 */
export class Preview extends EventEmitter {
  // The container is the HTML element which contains the menu preview. It is created in
  // the constructor and returned by the getContainer() method.
  private container: HTMLElement = null;

  // The canvas is the HTML element which contains the menu items. It is a sub-element
  // of the container. The intermediate elements are used to center the preview and to
  // create a fixed aspect ratio.
  private canvas: HTMLElement = null;

  // This array contains the chain of selected menu items up to the item which is
  // currently shown in the center. The first element is the menu's root, the second
  // element is the selected child of the root (if any), and so on.
  private selectionChain: Array<IEditorNode> = [];

  // The menu item which has been selected last time. This node has a special style in
  // the preview and its properties are drawn in the property editor on the right.
  private activeNode?: IEditorNode = null;

  /**
   * This constructor creates the HTML elements for the menu preview and wires up all the
   * functionality.
   */
  constructor() {
    super();

    const template = Handlebars.compile(require('./templates/preview.hbs').default);

    const div = document.createElement('div');
    div.innerHTML = template({
      containerId: 'kando-menu-preview-container',
      canvasId: 'kando-menu-preview-canvas',
    });

    this.container = div.firstElementChild as HTMLElement;

    // Keep a reference to the 'canvas' element. It is not the HTML5 canvas element, but
    // the element into which the menu items are rendered using HTML and CSS.
    this.canvas = this.container.querySelector(
      '#kando-menu-preview-canvas'
    ) as HTMLElement;
  }

  /** This method returns the container of the menu preview. */
  public getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * This method shows the menu preview. This is used when the toolbar of the editor is
   * collapsed.
   */
  public show() {
    this.container.classList.add('visible');
  }

  /**
   * This method hides the menu preview. This is used when the toolbar of the editor is
   * expanded.
   */
  public hide() {
    this.container.classList.remove('visible');
  }

  /**
   * This method is called when the menu preview should display a new menu. It is called
   * initially from the editor for the root menu.
   */
  public setMenu(root: IEditorNode) {
    this.selectionChain = [];
    this.setupAngles(root);
    this.selectNode(root);
  }

  /**
   * This method is called whenever a new (sub-)menu should be displayed. All currently
   * displayed menu items are removed and the new ones are added. A subtle animation is
   * used to indicate the change.
   */
  private update(transitionAngle: number) {
    if (this.selectionChain.length === 0) {
      return;
    }

    const centerItem = this.selectionChain[this.selectionChain.length - 1];
    const transitionDirection = math.getDirection(transitionAngle + 90, 1.0);

    // First fade out all currently displayed menu items.
    this.canvas.childNodes.forEach((c) => {
      const child = c as HTMLElement;

      if (c instanceof HTMLElement && child.classList.contains('visible')) {
        child.classList.remove('visible');
        child.style.setProperty('--dir-x', transitionDirection.x + '');
        child.style.setProperty('--dir-y', transitionDirection.y + '');

        console.log(transitionDirection);

        setTimeout(() => {
          c.remove();
        }, 500);
      }
    });

    const container = document.createElement('div');
    container.classList.add('kando-menu-preview-container');
    container.style.setProperty('--dir-x', -transitionDirection.x + '');
    container.style.setProperty('--dir-y', -transitionDirection.y + '');
    this.canvas.appendChild(container);

    // The big center div shows the icon of the currently selected menu.
    centerItem.itemDiv = document.createElement('div');
    centerItem.itemDiv.classList.add('kando-menu-preview-center');
    container.appendChild(centerItem.itemDiv);

    // If the center is selected, push its index to the selection chain.
    centerItem.itemDiv.addEventListener('click', () => {
      this.selectNode(centerItem);
    });

    const icon = this.createIcon(centerItem.icon, centerItem.iconTheme);
    centerItem.itemDiv.appendChild(icon);

    // Add the children of the currently selected menu in a circle around the center.
    if (centerItem.children?.length > 0) {
      centerItem.children.forEach((c) => {
        const child = c as IEditorNode;

        // Compute the direction towards the child.
        const position = math.getDirection(child.angle - 90, 1.0);

        // Create a div for the child and set the CSS variables for the position and
        // rotation.
        child.itemDiv = document.createElement('div');
        child.itemDiv.classList.add('kando-menu-preview-child');
        child.itemDiv.style.setProperty('--rotation', child.angle - 90 + 'deg');
        child.itemDiv.style.setProperty('--dir-x', position.x + '');
        child.itemDiv.style.setProperty('--dir-y', position.y + '');
        container.appendChild(child.itemDiv);

        // If the child is selected, push its index to the selection chain.
        child.itemDiv.addEventListener('click', () => {
          this.selectNode(child);
        });

        // Add the icon of the child.
        const icon = this.createIcon(child.icon, child.iconTheme);
        child.itemDiv.appendChild(icon);

        // If the child has children, we add little grandchild divs to the child div.
        if (child.children?.length > 0) {
          const grandChildContainer = document.createElement('div');
          grandChildContainer.classList.add('kando-menu-preview-grandchild-container');
          child.itemDiv.appendChild(grandChildContainer);

          child.children.forEach((grandChild) => {
            const grandChildDiv = document.createElement('div');
            grandChildDiv.classList.add('kando-menu-preview-grandchild');
            grandChildDiv.style.setProperty('--rotation', grandChild.angle - 90 + 'deg');

            grandChildContainer.appendChild(grandChildDiv);
          });
        }

        // Add a label to the child div. This is used to display the name of the menu
        // item. The label shows a connector line to the child div.
        const labelDivContainer = document.createElement('div');
        labelDivContainer.classList.add('kando-menu-preview-label-container');
        labelDivContainer.style.setProperty('--rotation', child.angle - 90 + 'deg');
        child.itemDiv.style.setProperty('--dir-x', position.x + '');
        child.itemDiv.style.setProperty('--dir-y', position.y + '');

        if (position.x < -0.001) {
          labelDivContainer.classList.add('left');
        } else if (position.x > 0.001) {
          labelDivContainer.classList.add('right');
        } else if (position.y < 0) {
          labelDivContainer.classList.add('top');
        } else {
          labelDivContainer.classList.add('bottom');
        }

        child.itemDiv.appendChild(labelDivContainer);

        // The actual label is in a nested div. This is used to ellipsize the text if
        // it is too long.
        const labelDiv = document.createElement('div');
        labelDiv.classList.add('kando-menu-preview-label');
        labelDiv.classList.add('kando-font');
        labelDiv.classList.add('fs-3');
        labelDiv.textContent = child.name;
        labelDivContainer.appendChild(labelDiv);
      });
    }

    // If we are currently showing a submenu, we add the back navigation link towards
    // the direction of the parent menu.
    if (this.selectionChain.length > 1) {
      const parent = this.selectionChain[this.selectionChain.length - 2];

      const position = math.getDirection(centerItem.angle - 90, 1.0);

      const backDiv = document.createElement('div');
      backDiv.classList.add('kando-menu-preview-backlink');
      backDiv.style.setProperty('--rotation', centerItem.angle - 90 + 'deg');
      backDiv.style.setProperty('--dir-x', position.x + '');
      backDiv.style.setProperty('--dir-y', position.y + '');
      container.appendChild(backDiv);

      backDiv.addEventListener('click', () => {
        this.selectNode(parent);
      });

      const icon = this.createIcon('arrow_back', 'material-symbols-rounded');
      backDiv.appendChild(icon);
    }

    // Finally, we fade in all menu items.
    setTimeout(() => {
      container.classList.add('visible');
    }, 0);
  }

  /**
   * This method is called when a menu item is selected. If the menu item has children,
   * the node is pushed to the selection chain and the preview is redrawn. In any case,
   * the 'select' event is emitted.
   *
   * @param node The node which has been selected.
   */
  private selectNode(node: IEditorNode) {
    // Only submenus can be part of the selection chain.
    if (node.type === 'submenu') {
      // If the node is already the last one in the selection chain, we do nothing. If it
      // is not the last one but somewhere else in the selection chain, we remove all
      // nodes after it. If it is not in the selection chain at all, we add it to the end.
      const index = this.selectionChain.indexOf(node);
      if (index >= 0 && index < this.selectionChain.length - 1) {
        const lastSelected = this.selectionChain[index + 1];
        this.selectionChain.splice(index + 1);
        this.update(lastSelected.angle + 180);
      } else if (index === -1) {
        this.selectionChain.push(node);
        this.update(node.angle);
      }
    }

    if (this.activeNode) {
      this.activeNode.itemDiv.classList.remove('active');
    }

    this.activeNode = node;
    node.itemDiv.classList.add('active');

    this.emit('select', node);
  }

  private createIcon(icon: string, theme: string) {
    const iconDiv = document.createElement('i');

    if (theme === 'material-symbols-rounded') {
      iconDiv.classList.add(theme);
      iconDiv.innerHTML = icon;
    } else if (theme === 'simple-icons') {
      iconDiv.classList.add('si');
      iconDiv.classList.add('si-' + icon);
    }

    return iconDiv;
  }

  /**
   * This method computes the 'angle' properties for the children of the given node. The
   * 'angle' property is the angle of the child relative to its parent.
   *
   * @param node The node for which to setup the angles recursively.
   */
  private setupAngles(node: IEditorNode) {
    // If the node has no children, we can stop here.
    if (!node.children || node.children.length === 0) {
      return;
    }

    // For all other cases, we have to compute the angles of the children. First, we
    // compute the angle towards the parent node. This will be undefined for the root
    // node.
    const parentAngle = (node.angle + 180) % 360;
    const angles = math.computeItemAngles(node.children, parentAngle);

    // Now we assign the corresponding angles to the children.
    for (let i = 0; i < node.children?.length; ++i) {
      const child = node.children[i];
      child.angle = angles[i];

      // Finally, we recursively setup the angles for the children of the child.
      this.setupAngles(child);
    }
  }
}
