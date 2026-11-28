package com.aurumgold.smartspend.sync

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.aurumgold.smartspend.sync.databinding.ItemSmsLogBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LogAdapter(private var logs: List<ForwardLog>) :
    RecyclerView.Adapter<LogAdapter.LogViewHolder>() {

    private val timeFormat = SimpleDateFormat("HH:mm:ss • dd MMM", Locale.getDefault())

    fun updateLogs(newLogs: List<ForwardLog>) {
        logs = newLogs
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val binding = ItemSmsLogBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return LogViewHolder(binding)
    }

    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(logs[position])
    }

    override fun getItemCount(): Int = logs.size

    inner class LogViewHolder(private val binding: ItemSmsLogBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(log: ForwardLog) {
            binding.tvSender.text = log.sender
            binding.tvTimestamp.text = timeFormat.format(Date(log.timestamp))
            binding.tvBody.text = log.body
            binding.tvStatusBadge.text = log.status

            val colorRes = if (log.isSuccess) R.color.status_green else R.color.status_red
            binding.tvStatusBadge.setTextColor(
                ContextCompat.getColor(binding.root.context, colorRes)
            )
        }
    }
}
