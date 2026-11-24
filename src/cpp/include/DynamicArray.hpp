#pragma once

#include "types.hpp"
#include <string>
#include <vector>

namespace smart_dsa {

struct DynamicArrayPushResult {
  int index = -1;
  bool resized = false;
  int oldCapacity = 0;
  int newCapacity = 0;
};

struct DynamicArrayRemoveResult {
  bool found = false;
  TaskItem removed;
  bool shrunk = false;
  int oldCapacity = 0;
  int newCapacity = 0;
};

/**
 * Manual Dynamic Array with explicit raw pointer buffer and automatic capacity doubling (4 -> 8 -> 16...).
 */
class TaskDynamicArray {
private:
  TaskItem** buffer_ = nullptr;
  int count_ = 0;
  int capacity_ = 4;
  std::vector<std::string> resizeHistory_;

  void resize(int newCapacity) {
    TaskItem** nextBuffer = new TaskItem*[newCapacity];
    for (int i = 0; i < newCapacity; ++i) {
      nextBuffer[i] = (i < count_) ? buffer_[i] : nullptr;
    }
    resizeHistory_.push_back(std::to_string(capacity_) + " -> " + std::to_string(newCapacity));
    delete[] buffer_;
    buffer_ = nextBuffer;
    capacity_ = newCapacity;
  }

  void allocateInitial(int initialCapacity) {
    capacity_ = initialCapacity > 0 ? initialCapacity : 4;
    buffer_ = new TaskItem*[capacity_];
    for (int i = 0; i < capacity_; ++i) {
      buffer_[i] = nullptr;
    }
    count_ = 0;
  }

public:
  explicit TaskDynamicArray(int initialCapacity = 4) {
    allocateInitial(initialCapacity);
  }

  ~TaskDynamicArray() {
    clear(false);
    delete[] buffer_;
    buffer_ = nullptr;
  }

  TaskDynamicArray(const TaskDynamicArray&) = delete;
  TaskDynamicArray& operator=(const TaskDynamicArray&) = delete;

  int length() const { return count_; }
  int capacity() const { return capacity_; }
  bool isEmpty() const { return count_ == 0; }

  DynamicArrayPushResult push(const TaskItem& task) {
    int oldCap = capacity_;
    bool resized = false;
    if (count_ == capacity_) {
      resize(capacity_ * 2);
      resized = true;
    }

    int insertIdx = count_;
    buffer_[insertIdx] = new TaskItem(task);
    ++count_;
    return {insertIdx, resized, oldCap, capacity_};
  }

  const TaskItem* get(int index) const {
    if (index < 0 || index >= count_) {
      return nullptr;
    }
    return buffer_[index];
  }

  int findIndexById(const std::string& id) const {
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr && buffer_[i]->id == id) {
        return i;
      }
    }
    return -1;
  }

  const TaskItem* findById(const std::string& id) const {
    int idx = findIndexById(id);
    return (idx != -1) ? buffer_[idx] : nullptr;
  }

  bool updateStatus(const std::string& id, TaskStatus status, TaskItem& outUpdated) {
    int idx = findIndexById(id);
    if (idx == -1 || buffer_[idx] == nullptr) {
      return false;
    }
    buffer_[idx]->status = status;
    outUpdated = *buffer_[idx];
    return true;
  }

  DynamicArrayRemoveResult removeById(const std::string& id) {
    int idx = findIndexById(id);
    if (idx == -1 || buffer_[idx] == nullptr) {
      return {false, TaskItem{}, false, capacity_, capacity_};
    }

    TaskItem removedCopy = *buffer_[idx];
    delete buffer_[idx];

    for (int i = idx; i < count_ - 1; ++i) {
      buffer_[i] = buffer_[i + 1];
    }
    --count_;
    buffer_[count_] = nullptr;

    int oldCap = capacity_;
    bool shrunk = false;
    if (capacity_ > 4 && count_ > 0 && count_ <= capacity_ / 4) {
      int targetCap = capacity_ / 2;
      if (targetCap < 4) targetCap = 4;
      resize(targetCap);
      shrunk = true;
    }

    return {true, removedCopy, shrunk, oldCap, capacity_};
  }

  std::vector<TaskItem> toArray() const {
    std::vector<TaskItem> out;
    out.reserve(count_);
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr) {
        out.push_back(*buffer_[i]);
      }
    }
    return out;
  }

  std::vector<std::string> getResizeHistory() const {
    return resizeHistory_;
  }

  void clear(bool resetBuffer = true) {
    for (int i = 0; i < count_; ++i) {
      delete buffer_[i];
      buffer_[i] = nullptr;
    }
    count_ = 0;
    resizeHistory_.clear();

    if (resetBuffer) {
      delete[] buffer_;
      allocateInitial(4);
    }
  }
};

} // namespace smart_dsa
