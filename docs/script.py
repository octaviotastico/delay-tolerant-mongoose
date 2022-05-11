import matplotlib.pyplot as plt
import random

# Units
bit = 1
byte = 8 * bit
kilobyte = 1024 * byte
megabyte = 1024 * kilobyte
gigabyte = 1024 * megabyte

# Mongoose Constants
collection_struct_size = 4.10 * kilobyte
collection_index_size = 4.10 * kilobyte
min_collection_size = collection_struct_size + collection_index_size

# Example document size
min_document_size = 200 * byte

# Example amount of edits
edits = 6

# Generate an array of randomly increasing sizes
document_sizes = [min_document_size]
for i in range(1, edits):
  document_sizes.append(document_sizes[i - 1] + (min_document_size * random.random()))


# Original collection size
original_collection_size = [min_collection_size]
for i in range(1, len(document_sizes)):
  original_collection_size.append(min_collection_size + (document_sizes[i - 1]))
# Data in kilobytes
original_collection_size = [x / kilobyte for x in original_collection_size]


# File History collection size
file_history_collection_size = [min_collection_size]
for i in range(1, len(document_sizes)):
  file_history_collection_size.append(file_history_collection_size[i - 1] + (document_sizes[i - 1]))
# Data in kilobytes
file_history_collection_size = [x / kilobyte for x in file_history_collection_size]

# Plot the document sizes and the File History collection size
plt.plot(file_history_collection_size, label='Delay Tolerant Mongoose File History collection size', marker='o', color='blueviolet')
plt.plot(original_collection_size, label='Mongoose collection size', marker='o', color='violet')
plt.ylabel('Size (in kilobytes)')
plt.xlabel('Document version (n\'th version of the document)')
plt.legend()
plt.show()
