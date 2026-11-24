#pragma once

#include "types.hpp"
#include <cstdint>
#include <string>
#include <vector>

namespace smart_dsa {

struct BSTNode {
  TaskItem task;
  BSTNode* left = nullptr;
  BSTNode* right = nullptr;
};

/**
 * Manual Deadline-Ordered Binary Search Tree (BST) with in-order successor deletion,
 * calendar-date range pruning, and in-order traversal (earliest deadline first).
 */
class TaskDeadlineBST {
private:
  BSTNode* root_ = nullptr;
  int nodeCount_ = 0;

  static int compareKeys(const TaskItem& a, const TaskItem& b) {
    if (a.deadlineTimestamp < b.deadlineTimestamp) return -1;
    if (a.deadlineTimestamp > b.deadlineTimestamp) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  }

  static BSTNode* findMinNode(BSTNode* node) {
    BSTNode* curr = node;
    while (curr != nullptr && curr->left != nullptr) {
      curr = curr->left;
    }
    return curr;
  }

  static BSTNode* deleteRec(
      BSTNode* node,
      const std::string& targetId,
      int64_t targetTs,
      bool& outDeleted) {
    if (node == nullptr) return nullptr;

    if (targetTs < node->task.deadlineTimestamp ||
        (targetTs == node->task.deadlineTimestamp && targetId < node->task.id)) {
      node->left = deleteRec(node->left, targetId, targetTs, outDeleted);
      return node;
    }

    if (targetTs > node->task.deadlineTimestamp ||
        (targetTs == node->task.deadlineTimestamp && targetId > node->task.id)) {
      node->right = deleteRec(node->right, targetId, targetTs, outDeleted);
      return node;
    }

    outDeleted = true;
    if (node->left == nullptr && node->right == nullptr) {
      delete node;
      return nullptr;
    }
    if (node->left == nullptr) {
      BSTNode* rightChild = node->right;
      delete node;
      return rightChild;
    }
    if (node->right == nullptr) {
      BSTNode* leftChild = node->left;
      delete node;
      return leftChild;
    }

    BSTNode* successor = findMinNode(node->right);
    node->task = successor->task;
    bool dummy = false;
    node->right = deleteRec(node->right, successor->task.id, successor->task.deadlineTimestamp, dummy);
    return node;
  }

  static void rangeTraverse(
      BSTNode* node,
      int64_t startTs,
      int64_t endTs,
      std::vector<TaskItem>& matches,
      std::vector<std::string>& visitedIds,
      int& comparisons) {
    if (node == nullptr) return;
    visitedIds.push_back(node->task.id);
    ++comparisons;

    if (node->task.deadlineTimestamp > startTs) {
      rangeTraverse(node->left, startTs, endTs, matches, visitedIds, comparisons);
    }
    if (node->task.deadlineTimestamp >= startTs && node->task.deadlineTimestamp <= endTs) {
      matches.push_back(node->task);
    }
    if (node->task.deadlineTimestamp < endTs) {
      rangeTraverse(node->right, startTs, endTs, matches, visitedIds, comparisons);
    }
  }

  static void walkInOrder(BSTNode* node, std::vector<TaskItem>& ordered) {
    if (node == nullptr) return;
    walkInOrder(node->left, ordered);
    ordered.push_back(node->task);
    walkInOrder(node->right, ordered);
  }

  static void assignCoords(
      BSTNode* node,
      int depth,
      int& inOrderCounter,
      std::vector<BSTVisualNode>& outNodes) {
    if (node == nullptr) return;
    assignCoords(node->left, depth + 1, inOrderCounter, outNodes);
    BSTVisualNode vis;
    vis.id = node->task.id;
    vis.task = node->task;
    vis.x = inOrderCounter++;
    vis.y = depth;
    vis.leftId = (node->left != nullptr) ? node->left->task.id : "";
    vis.rightId = (node->right != nullptr) ? node->right->task.id : "";
    outNodes.push_back(vis);
    assignCoords(node->right, depth + 1, inOrderCounter, outNodes);
  }

  static void destroySubtree(BSTNode* node) {
    if (node == nullptr) return;
    destroySubtree(node->left);
    destroySubtree(node->right);
    delete node;
  }

public:
  TaskDeadlineBST() = default;

  ~TaskDeadlineBST() {
    clear();
  }

  TaskDeadlineBST(const TaskDeadlineBST&) = delete;
  TaskDeadlineBST& operator=(const TaskDeadlineBST&) = delete;

  int size() const { return nodeCount_; }
  bool isEmpty() const { return root_ == nullptr; }
  const BSTNode* root() const { return root_; }

  void insert(const TaskItem& task) {
    BSTNode* newNode = new BSTNode{task, nullptr, nullptr};
    if (root_ == nullptr) {
      root_ = newNode;
      ++nodeCount_;
      return;
    }

    BSTNode* curr = root_;
    while (curr != nullptr) {
      int cmp = compareKeys(task, curr->task);
      if (cmp < 0) {
        if (curr->left == nullptr) {
          curr->left = newNode;
          ++nodeCount_;
          return;
        }
        curr = curr->left;
      } else {
        if (curr->right == nullptr) {
          curr->right = newNode;
          ++nodeCount_;
          return;
        }
        curr = curr->right;
      }
    }
  }

  bool updateTaskStatus(const std::string& taskId, int64_t deadlineTimestamp, TaskStatus status) {
    BSTNode* curr = root_;
    while (curr != nullptr) {
      if (curr->task.id == taskId) {
        curr->task.status = status;
        return true;
      }
      if (deadlineTimestamp < curr->task.deadlineTimestamp) {
        curr = curr->left;
      } else if (deadlineTimestamp > curr->task.deadlineTimestamp) {
        curr = curr->right;
      } else {
        curr = (taskId < curr->task.id) ? curr->left : curr->right;
      }
    }
    return false;
  }

  bool remove(const std::string& taskId, int64_t deadlineTimestamp) {
    bool deleted = false;
    root_ = deleteRec(root_, taskId, deadlineTimestamp, deleted);
    if (deleted) {
      --nodeCount_;
    }
    return deleted;
  }

  BSTSearchResult searchByTimestampRange(int64_t startTs, int64_t endTs) const {
    BSTSearchResult res;
    rangeTraverse(root_, startTs, endTs, res.matches, res.visitedIds, res.comparisons);
    res.found = !res.matches.empty();
    return res;
  }

  // Parses YYYY-MM-DD to UTC day bounds and executes BST-pruned rangeTraverse
  BSTSearchResult searchByDate(const std::string& datePrefix) const {
    if (datePrefix.size() != 10 || datePrefix[4] != '-' || datePrefix[7] != '-') {
      return {};
    }
    auto parseInt = [](const std::string& s, size_t pos, size_t len, int& out) -> bool {
      int val = 0;
      for (size_t i = 0; i < len; ++i) {
        char c = s[pos + i];
        if (c < '0' || c > '9') return false;
        val = val * 10 + (c - '0');
      }
      out = val;
      return true;
    };
    int year = 0, month = 0, day = 0;
    if (!parseInt(datePrefix, 0, 4, year) ||
        !parseInt(datePrefix, 5, 2, month) ||
        !parseInt(datePrefix, 8, 2, day)) {
      return {};
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return {};

    // Howard Hinnant civil-from-days formula -> epoch seconds
    int y = year - (month <= 2 ? 1 : 0);
    int era = (y >= 0 ? y : y - 399) / 400;
    int yoe = y - era * 400;
    int doy = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1;
    int doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    int64_t days = static_cast<int64_t>(era) * 146097 + doe - 719468;

    int64_t startTs = days * 86400000LL;
    int64_t endTs = startTs + 86399999LL;
    return searchByTimestampRange(startTs, endTs);
  }

  BSTSearchResult searchByDatePrefix(const std::string& datePrefix) const {
    BSTSearchResult res;
    std::vector<TaskItem> all = inOrderTraversal();
    for (size_t i = 0; i < all.size(); ++i) {
      ++res.comparisons;
      res.visitedIds.push_back(all[i].id);
      if (all[i].deadline.rfind(datePrefix, 0) == 0) {
        res.matches.push_back(all[i]);
      }
    }
    res.found = !res.matches.empty();
    return res;
  }

  std::vector<TaskItem> inOrderTraversal() const {
    std::vector<TaskItem> ordered;
    ordered.reserve(nodeCount_);
    walkInOrder(root_, ordered);
    return ordered;
  }

  std::vector<BSTVisualNode> getTreeLayout() const {
    if (root_ == nullptr) return {};
    std::vector<BSTVisualNode> nodes;
    nodes.reserve(nodeCount_);
    int counter = 0;
    assignCoords(root_, 0, counter, nodes);
    return nodes;
  }

  void clear() {
    destroySubtree(root_);
    root_ = nullptr;
    nodeCount_ = 0;
  }
};

} // namespace smart_dsa
